package dev.worldagent;

import com.google.gson.*;
import com.sun.net.httpserver.*;
import com.sk89q.worldedit.WorldEdit;
import com.sk89q.worldedit.bukkit.BukkitAdapter;
import com.sk89q.worldedit.math.BlockVector3;
import com.sk89q.worldedit.util.SideEffectSet;
import org.bukkit.*;
import org.bukkit.block.TileState;
import org.bukkit.entity.Player;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.util.BoundingBox;
import java.io.*;
import java.net.*;
import java.nio.charset.StandardCharsets;
import java.nio.file.*;
import java.security.*;
import java.time.Instant;
import java.util.*;
import java.util.concurrent.*;

/** All world and ledger access is serialized on Paper's main thread. */
public final class WorldAgentPlugin extends JavaPlugin {
    private final Gson gson = new GsonBuilder().disableHtmlEscaping().create();
    private HttpServer http;
    private ExecutorService executor;
    private Policy policy;
    private Ledger ledger;
    private Path directory;
    private String token;
    private boolean recoveryBlocked;
    private AdventureRuntime adventure;
    private ThreeOhSevenRuntime threeOhSeven;
    private final Map<String,String> activeMaps = new LinkedHashMap<>();
    record Bounds(int[] min, int[] max) {
        long volume() { return ((long)max[0]-min[0]+1)*((long)max[1]-min[1]+1)*((long)max[2]-min[2]+1); }
        boolean contains(Bounds b) { for(int i=0;i<3;i++) if(b.min[i]<min[i] || b.max[i]>max[i]) return false; return true; }
        boolean overlaps(Bounds b) { for(int i=0;i<3;i++) if(max[i]<b.min[i] || min[i]>b.max[i]) return false; return true; }
    }
    static final class Policy {
        String world; int port, maxVolume, maxOperations; Bounds buildZone; List<Bounds> protectedRegions; List<String> palette;
    }
    static final class Transaction {
        String id, name, actor, prompt, status="STAGED", previewHash;
        Bounds bounds;
        int operations;
        Map<String,String> before = new LinkedHashMap<>(), after = new LinkedHashMap<>();
    }
    static final class Receipt { String fingerprint; JsonObject response; Receipt(String f,JsonObject r){fingerprint=f;response=r;} }
    static final class Ledger {
        Map<String,Transaction> transactions = new LinkedHashMap<>();
        Map<String,Transaction> snapshots = new LinkedHashMap<>();
        Map<String,Receipt> receipts = new LinkedHashMap<>();
    }
    @Override public void onEnable() {
        try {
            directory=getDataFolder().toPath(); Files.createDirectories(directory);
            token=Files.readString(directory.resolve("token")).trim();
            if(!token.matches("[a-f0-9]{64}")) throw new IllegalArgumentException("Invalid project token; run setup");
            policy=gson.fromJson(Files.readString(directory.resolve("policy.json")),Policy.class);
            if(policy.maxVolume<1 || policy.maxVolume>8192 || policy.maxOperations<1 || policy.maxOperations>128) throw new IllegalArgumentException("Unsafe policy limits");
            Path state=directory.resolve("ledger.json");
            ledger=Files.exists(state)?gson.fromJson(Files.readString(state),Ledger.class):new Ledger();
            Path modes=directory.resolve("active-maps.json");
            if(Files.exists(modes))for(var entry:JsonParser.parseString(Files.readString(modes)).getAsJsonObject().entrySet())activeMaps.put(entry.getKey(),entry.getValue().getAsString());
            // Crash recovery is deliberately fail-closed: never guess whether external edits are ours.
            recoveryBlocked=ledger.transactions.values().stream().anyMatch(t->t.status.equals("APPLYING") || t.status.equals("RESTORING"));
            http=HttpServer.create(new InetSocketAddress(InetAddress.getByName("127.0.0.1"),policy.port),16);
            executor=new ThreadPoolExecutor(2,2,0,TimeUnit.SECONDS,new ArrayBlockingQueue<>(16),new ThreadPoolExecutor.AbortPolicy());
            http.setExecutor(executor); http.createContext("/rpc",this::handle);
            http.createContext("/pack",e->{try{if(!e.getRequestMethod().equals("GET")||!e.getRequestURI().getPath().equals("/pack")){e.sendResponseHeaders(404,-1);return;}byte[] bytes=Files.readAllBytes(directory.resolve("resource-pack.zip"));e.getResponseHeaders().set("Content-Type","application/zip");e.sendResponseHeaders(200,bytes.length);e.getResponseBody().write(bytes);}finally{e.close();}});
            http.start();
            if(Files.exists(directory.resolve("world-model.json")))adventure=new AdventureRuntime(this);
            if(Files.exists(directory.resolve("three-oh-seven-world.json")))threeOhSeven=new ThreeOhSevenRuntime(this);
            getLogger().info("Authenticated bridge on 127.0.0.1:"+policy.port+"; recoveryBlocked="+recoveryBlocked);
        } catch(Exception e) { getLogger().log(java.util.logging.Level.SEVERE,"Bridge startup failed",e);getServer().getPluginManager().disablePlugin(this); }
    }
    @Override public void onDisable() { try{if(threeOhSeven!=null)threeOhSeven.close();if(adventure!=null)adventure.close();saveActiveMaps();}finally{if(http!=null)http.stop(0); if(executor!=null)executor.shutdownNow();} }
    String activeMap(Player player){return activeMaps.get(player.getUniqueId().toString());}
    boolean isActive(Player player,String mapId){return mapId.equals(activeMap(player));}
    void setActiveMap(Player player,String mapId){activeMaps.put(player.getUniqueId().toString(),mapId);saveActiveMaps();}
    private void saveActiveMaps(){
        try{JsonObject data=new JsonObject();activeMaps.forEach(data::addProperty);Path target=directory.resolve("active-maps.json"),tmp=directory.resolve("active-maps.tmp");Files.writeString(tmp,gson.toJson(data),StandardOpenOption.CREATE,StandardOpenOption.TRUNCATE_EXISTING,StandardOpenOption.WRITE);Files.move(tmp,target,StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
        catch(IOException e){throw new IllegalStateException("Active map persistence failed",e);}
    }
    private void handle(HttpExchange exchange) throws IOException {
        try {
            if(!exchange.getRemoteAddress().getAddress().isLoopbackAddress() || exchange.getRequestHeaders().containsKey("Origin")) { send(exchange,403,error("LOCAL_ONLY"));return; }
            String auth=exchange.getRequestHeaders().getFirst("Authorization");
            if(auth==null || !MessageDigest.isEqual(("Bearer "+token).getBytes(StandardCharsets.UTF_8),auth.getBytes(StandardCharsets.UTF_8))) {send(exchange,401,error("UNAUTHORIZED"));return;}
            if(!exchange.getRequestMethod().equals("POST") || !exchange.getRequestURI().getPath().equals("/rpc")) {send(exchange,405,error("POST /rpc required"));return;}
            byte[] body=exchange.getRequestBody().readNBytes(1_048_577);
            if(body.length>1_048_576) {send(exchange,413,error("REQUEST_TOO_LARGE"));return;}
            JsonObject request=JsonParser.parseString(new String(body,StandardCharsets.UTF_8)).getAsJsonObject();
            Future<JsonObject> future=getServer().getScheduler().callSyncMethod(this,()->dispatch(request));
            try { send(exchange,200,future.get(30,TimeUnit.SECONDS)); }
            catch(TimeoutException e) { future.cancel(false);send(exchange,504,error("OUTCOME_UNKNOWN: retry the exact requestId; do not create a new mutation")); }
            catch(ExecutionException e) {send(exchange,400,error(e.getCause().getMessage()));}
        }catch(Exception e){send(exchange,400,error("INVALID_REQUEST: "+e.getMessage()));}
        finally {exchange.close();}
    }
    private JsonObject error(String message){ JsonObject r=new JsonObject();r.addProperty("ok",false);r.addProperty("error",message==null?"Unknown failure":message);return r; }
    private void send(HttpExchange e,int status,JsonObject data)throws IOException{byte[] b=gson.toJson(data).getBytes(StandardCharsets.UTF_8);e.getResponseHeaders().set("Content-Type","application/json");e.sendResponseHeaders(status,b.length);e.getResponseBody().write(b);}
    private String string(JsonObject o,String key){if(!o.has(key)||!o.get(key).isJsonPrimitive()||!o.get(key).getAsJsonPrimitive().isString())throw new IllegalArgumentException("Missing string: "+key);String s=o.get(key).getAsString();if(s.isBlank()||s.length()>2000)throw new IllegalArgumentException("Invalid "+key);return s;}
    private int integer(JsonObject o,String key,int min,int max){if(!o.has(key)||!o.get(key).isJsonPrimitive()||!o.getAsJsonPrimitive(key).isNumber())throw new IllegalArgumentException("Invalid number: "+key);double n=o.get(key).getAsDouble();if(!Double.isFinite(n)||n!=Math.rint(n)||n<min||n>max)throw new IllegalArgumentException("Invalid integer: "+key);return (int)n;}
    private Bounds bounds(JsonObject o){
        JsonObject b=o.getAsJsonObject("bounds");int[] min=new int[3],max=new int[3];
        if(b==null||b.getAsJsonArray("min").size()!=3||b.getAsJsonArray("max").size()!=3)throw new IllegalArgumentException("Invalid bounds");
        for(int i=0;i<3;i++){if(!b.getAsJsonArray("min").get(i).isJsonPrimitive()||!b.getAsJsonArray("max").get(i).isJsonPrimitive()||!b.getAsJsonArray("min").get(i).getAsJsonPrimitive().isNumber()||!b.getAsJsonArray("max").get(i).getAsJsonPrimitive().isNumber())throw new IllegalArgumentException("Coordinates must be numbers");double a=b.getAsJsonArray("min").get(i).getAsDouble(),z=b.getAsJsonArray("max").get(i).getAsDouble();if(!Double.isFinite(a)||!Double.isFinite(z)||a!=Math.rint(a)||z!=Math.rint(z)||a < -30000000||z>30000000||a>z)throw new IllegalArgumentException("Invalid coordinate bounds");min[i]=(int)a;max[i]=(int)z;}
        Bounds result=new Bounds(min,max);check(result,false);return result;
    }
    private void check(Bounds b,boolean write){
        if(!policy.buildZone.contains(b))throw new IllegalArgumentException("OUTSIDE_BUILD_ZONE");
        if(b.volume()>policy.maxVolume)throw new IllegalArgumentException("VOLUME_LIMIT: "+b.volume());
        if(b.min[1]<world().getMinHeight()||b.max[1]>=world().getMaxHeight())throw new IllegalArgumentException("WORLD_HEIGHT");
        if(write)for(Bounds p:policy.protectedRegions)if(p.overlaps(b))throw new IllegalArgumentException("PROTECTED_REGION");
    }
    private World world(){World w=getServer().getWorld(policy.world);if(w==null)throw new IllegalStateException("WORLD_UNAVAILABLE");return w;}
    private String key(int x,int y,int z){return x+","+y+","+z;}
    private int[] position(String k){return Arrays.stream(k.split(",")).mapToInt(Integer::parseInt).toArray();}
    private Map<String,String> read(Bounds b,boolean strict){
        check(b,false);Map<String,String> blocks=new LinkedHashMap<>();
        for(int x=b.min[0];x<=b.max[0];x++)for(int y=b.min[1];y<=b.max[1];y++)for(int z=b.min[2];z<=b.max[2];z++){
            var block=world().getBlockAt(x,y,z);
            if(strict && (block.getState() instanceof TileState || !policy.palette.contains(block.getType().getKey().toString())))throw new IllegalArgumentException("UNSUPPORTED_SNAPSHOT_BLOCK: "+key(x,y,z)+" "+block.getType());
            blocks.put(key(x,y,z),block.getBlockData().getAsString());
        }return blocks;
    }
    private JsonArray entities(Bounds b){JsonArray result=new JsonArray();for(var e:world().getNearbyEntities(new BoundingBox(b.min[0],b.min[1],b.min[2],b.max[0]+1,b.max[1]+1,b.max[2]+1))){JsonObject v=new JsonObject();v.addProperty("id",e.getUniqueId().toString());v.addProperty("type",e.getType().name());v.add("position",gson.toJsonTree(new double[]{e.getX(),e.getY(),e.getZ()}));result.add(v);}return result;}
    private void writable(Bounds b){
        check(b,true);
        // Display/Interaction entities are plugin-owned world prompts. Block fills cannot mutate
        // them, while players and living entities still make a transaction fail closed.
        boolean occupied=world().getNearbyEntities(new BoundingBox(b.min[0],b.min[1],b.min[2],b.max[0]+1,b.max[1]+1,b.max[2]+1))
            .stream().anyMatch(e->!(e instanceof org.bukkit.entity.Display)&&!(e instanceof org.bukkit.entity.Interaction));
        if(occupied)throw new IllegalArgumentException("REGION_OCCUPIED: entities are outside block snapshot coverage");
    }
    private String hash(Object value){try{return HexFormat.of().formatHex(MessageDigest.getInstance("SHA-256").digest(gson.toJson(value).getBytes(StandardCharsets.UTF_8)));}catch(Exception e){throw new IllegalStateException(e);}}
    private void persist()throws IOException{
        Path tmp=directory.resolve("ledger.tmp");
        try(var out=new FileOutputStream(tmp.toFile())){out.write(gson.toJson(ledger).getBytes(StandardCharsets.UTF_8));out.getFD().sync();}
        Files.move(tmp,directory.resolve("ledger.json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);
    }
    private void audit(JsonObject request,JsonObject response)throws IOException{
        JsonObject row=new JsonObject();row.addProperty("at",Instant.now().toString());row.add("request",request);row.add("result",response);
        try(var out=new FileOutputStream(directory.resolve("audit.jsonl").toFile(),true)){out.write((gson.toJson(row)+"\n").getBytes(StandardCharsets.UTF_8));out.getFD().sync();}
    }
    private JsonObject dispatch(JsonObject r)throws Exception{
        String requestId=string(r,"requestId");UUID.fromString(requestId);string(r,"actor");string(r,"prompt");String tool=string(r,"tool");
        JsonObject a=r.getAsJsonObject("args");if(a==null)throw new IllegalArgumentException("args object required");
        String fingerprint=hash(r);Receipt old=ledger.receipts.get(requestId);
        if(old!=null){if(!old.fingerprint.equals(fingerprint))throw new IllegalArgumentException("REQUEST_ID_REUSED_WITH_DIFFERENT_PAYLOAD");return old.response;}
        JsonObject response;
        try{
            if(recoveryBlocked && !Set.of("world.get_summary","world.get_blocks","world.get_entities","world.get_change_history").contains(tool))throw new IllegalStateException("RECOVERY_REQUIRED: interrupted write; stop server and review ledger before recovery");
            response=execute(tool,a,r);response.addProperty("ok",true);
        }catch(IllegalArgumentException|IllegalStateException e){response=error(e.getMessage());}
        catch(Exception e){recoveryBlocked=true;throw new IllegalStateException("STORAGE_OR_WORLD_FAILURE: bridge locked for review",e);}
        response.addProperty("requestId",requestId);
        try { audit(r,response); } catch(IOException e) { recoveryBlocked=true;throw e; }
        // Store mutation receipts durably; read calls need no deduplication and do not grow the ledger.
        if(!tool.startsWith("world.")){ledger.receipts.put(requestId,new Receipt(fingerprint,response));persist();}
        return response;
    }
    private JsonObject execute(String tool,JsonObject a,JsonObject request)throws Exception{
        JsonObject out=new JsonObject();
        switch(tool){
            case "gameplay.get_state" -> {if(adventure==null)throw new IllegalStateException("GAMEPLAY_NOT_DEPLOYED");JsonObject village=adventure.inspect(a.has("playerId")?string(a,"playerId"):null);for(var entry:village.entrySet())out.add(entry.getKey(),entry.getValue().deepCopy());if(threeOhSeven!=null)out.add("threeOhSeven",threeOhSeven.inspect(a.has("playerId")?string(a,"playerId"):null));}
            case "gameplay.run_self_test" -> {if(adventure==null)throw new IllegalStateException("GAMEPLAY_NOT_DEPLOYED");JsonObject village=adventure.selfTest();for(var entry:village.entrySet())out.add(entry.getKey(),entry.getValue().deepCopy());if(threeOhSeven!=null)out.add("threeOhSeven",threeOhSeven.selfTest());}
            case "world.get_summary" -> {out.addProperty("server",getServer().getVersion());out.addProperty("world",world().getName());out.addProperty("worldedit",getServer().getPluginManager().getPlugin("WorldEdit").getPluginMeta().getVersion());out.add("policy",gson.toJsonTree(policy));out.addProperty("recoveryBlocked",recoveryBlocked);}
            case "world.get_blocks" -> {Bounds b=bounds(a);var blocks=read(b,false);out.add("bounds",gson.toJsonTree(b));out.add("blocks",gson.toJsonTree(blocks));out.addProperty("checksum",hash(blocks));}
            case "world.get_entities" -> out.add("entities",entities(bounds(a)));
            case "world.get_change_history" -> {JsonArray list=new JsonArray();for(Transaction t:ledger.transactions.values()){JsonObject v=preview(t);v.remove("palette");list.add(v);}out.add("changes",list);JsonArray snapshots=new JsonArray();for(Transaction s:ledger.snapshots.values()){JsonObject v=new JsonObject();v.addProperty("snapshotId",s.id);v.add("bounds",gson.toJsonTree(s.bounds));snapshots.add(v);}out.add("snapshots",snapshots);}
            case "build.begin_transaction" -> {
                if(ledger.transactions.values().stream().filter(t->t.status.equals("STAGED")).count()>=32)throw new IllegalStateException("TOO_MANY_STAGED_TRANSACTIONS");
                Transaction t=new Transaction();t.id=string(request,"requestId");t.name=string(a,"name");t.bounds=bounds(a);writable(t.bounds);t.actor=string(request,"actor");t.prompt=string(request,"prompt");t.before=read(t.bounds,true);t.after.putAll(t.before);ledger.transactions.put(t.id,t);out=preview(t);
            }
            case "build.fill_region", "build.replace_palette" -> {
                Transaction t=transaction(a);staged(t);Bounds b=bounds(a);check(b,true);if(!t.bounds.contains(b))throw new IllegalArgumentException("OUTSIDE_TRANSACTION");
                if(t.operations>=policy.maxOperations)throw new IllegalArgumentException("OPERATION_LIMIT");
                String block=string(a,tool.equals("build.fill_region")?"block":"to");
                var parsedBlock=Bukkit.createBlockData(block);String material=parsedBlock.getMaterial().getKey().toString();
                if(!policy.palette.contains(material))throw new IllegalArgumentException("BLOCK_NOT_ALLOWED");
                String from=tool.equals("build.replace_palette")?Bukkit.createBlockData(string(a,"from")).getMaterial().getKey().toString():null;
                int percent=from==null?100:integer(a,"percent",0,100);int seed=from==null?0:integer(a,"seed",Integer.MIN_VALUE,Integer.MAX_VALUE);
                String state=parsedBlock.getAsString();
                List<String> eligible=new ArrayList<>();
                for(String k:t.after.keySet()){int[] p=position(k);if(b.contains(new Bounds(p,p)) && (from==null || t.after.get(k).split("\\[")[0].equals(from)))eligible.add(k);}
                if(from!=null)eligible.sort(Comparator.comparing(k->hash(seed+":"+k)));
                int count=eligible.size()*percent/100;for(int i=0;i<count;i++)t.after.put(eligible.get(i),state);
                t.operations++;t.previewHash=null;out=preview(t);out.addProperty("selectedBlocks",count);
            }
            case "build.dry_run" -> {Transaction t=transaction(a);staged(t);t.previewHash=hash(t.after);out=preview(t);out.addProperty("previewHash",t.previewHash);}
            case "build.commit_transaction" -> {
                Transaction t=transaction(a);
                if(t.status.equals("COMMITTED")){out=preview(t);break;}
                staged(t);String approved=string(a,"previewHash");if(t.previewHash==null||!approved.equals(t.previewHash)||!approved.equals(hash(t.after)))throw new IllegalArgumentException("DRY_RUN_REQUIRED_OR_STALE");
                writable(t.bounds);if(!read(t.bounds,true).equals(t.before))throw new IllegalStateException("WORLD_CONFLICT: world changed since begin");
                // A durable before-image exists before the first world write.
                t.status="APPLYING";persist();apply(t.after);world().save();t.status="COMMITTED";persist();out=preview(t);
            }
            case "build.rollback_transaction", "build.undo" -> {
                Transaction t=transaction(a);
                if(t.status.equals("ROLLED_BACK")||t.status.equals("CANCELLED")){out=preview(t);break;}
                if(t.status.equals("STAGED")){t.status="CANCELLED";out=preview(t);break;}
                if(!t.status.equals("COMMITTED"))throw new IllegalStateException("INVALID_TRANSACTION_STATE");
                writable(t.bounds);if(!read(t.bounds,true).equals(t.after))throw new IllegalStateException("UNDO_CONFLICT: later edits would be overwritten");
                t.status="RESTORING";persist();apply(t.before);world().save();t.status="ROLLED_BACK";persist();out=preview(t);
            }
            case "snapshot.create" -> {
                Bounds b=bounds(a);writable(b);Transaction t=new Transaction();t.id=string(request,"requestId");t.name=string(a,"name");t.bounds=b;t.before=read(b,true);t.status="SNAPSHOT";ledger.snapshots.put(t.id,t);out.addProperty("snapshotId",t.id);out.addProperty("checksum",hash(t.before));out.addProperty("coverage","inert block data only; no entities, inventories, ticks or biome data");
            }
            case "snapshot.stage_restore" -> {
                Transaction s=ledger.snapshots.get(string(a,"snapshotId"));if(s==null)throw new IllegalArgumentException("UNKNOWN_SNAPSHOT");
                writable(s.bounds);Transaction t=new Transaction();t.id=string(request,"requestId");t.name="restore "+s.name;t.actor=string(request,"actor");t.prompt=string(request,"prompt");t.bounds=s.bounds;t.before=read(t.bounds,true);t.after.putAll(s.before);ledger.transactions.put(t.id,t);out=preview(t);
            }
            default -> throw new IllegalArgumentException("UNKNOWN_TOOL: "+tool);
        }return out;
    }
    private Transaction transaction(JsonObject a){String id=string(a,"transactionId");Transaction t=ledger.transactions.get(id);if(t==null)throw new IllegalArgumentException("UNKNOWN_TRANSACTION");return t;}
    private void staged(Transaction t){if(!t.status.equals("STAGED"))throw new IllegalStateException("TRANSACTION_NOT_STAGED");}
    private JsonObject preview(Transaction t){JsonObject v=new JsonObject();v.addProperty("transactionId",t.id);v.addProperty("changeId",t.id);v.addProperty("name",t.name);v.addProperty("status",t.status);v.add("bounds",gson.toJsonTree(t.bounds));v.addProperty("volume",t.bounds.volume());v.addProperty("changedBlocks",t.after.entrySet().stream().filter(e->!e.getValue().equals(t.before.get(e.getKey()))).count());v.add("palette",gson.toJsonTree(new TreeSet<>(t.after.values())));v.addProperty("operations",t.operations);return v;}
    private void apply(Map<String,String> states)throws Exception{
        try(var edit=WorldEdit.getInstance().newEditSessionBuilder().world(BukkitAdapter.adapt(world())).maxBlocks(policy.maxVolume).build()){
            edit.setSideEffectApplier(SideEffectSet.none());
            for(var e:states.entrySet()){int[] p=position(e.getKey());edit.setBlock(BlockVector3.at(p[0],p[1],p[2]),BukkitAdapter.adapt(Bukkit.createBlockData(e.getValue())));}
        }catch(Exception e){recoveryBlocked=true;throw new IllegalStateException("APPLY_FAILED_RECOVERY_REQUIRED: "+e.getMessage(),e);}
    }
}
