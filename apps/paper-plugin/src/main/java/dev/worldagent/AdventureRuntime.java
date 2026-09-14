package dev.worldagent;

import com.google.gson.*;
import org.bukkit.*;
import org.bukkit.attribute.Attribute;
import org.bukkit.boss.*;
import org.bukkit.command.*;
import org.bukkit.entity.*;
import org.bukkit.event.*;
import org.bukkit.event.entity.*;
import org.bukkit.event.inventory.InventoryClickEvent;
import org.bukkit.event.player.*;
import org.bukkit.inventory.*;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.potion.*;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import java.nio.file.*;
import java.io.*;
import java.util.*;

/** First playable runtime. Player listener coverage still requires a real client playtest. */
public final class AdventureRuntime implements Listener, CommandExecutor {
    private final WorldAgentPlugin plugin;
    private final Gson gson=new Gson();
    private final Path directory;
    private final JsonObject model,dialogue;
    private final Map<UUID,Progression.State> states=new HashMap<>();
    private final Set<UUID> participants=new HashSet<>();
    private final Map<UUID,Long> messageTimes=new HashMap<>(),freezeUntil=new HashMap<>();
    private final NpcDisplay display;
    private LivingEntity boss;
    private BossBar bossBar;
    private int phase=1,pulse;
    private String packHash;
    private Chunk maraChunk;
    private final NamespacedKey propKey,choiceKey;
    private final List<Entity> propEntities=new ArrayList<>();
    private final Set<Chunk> propChunks=new HashSet<>();
    interface NpcDisplay { void spawn(); void ensure(); boolean matches(Entity entity); Location location(); void remove(); }
    private final class VanillaDisplay implements NpcDisplay {
        private Villager entity;
        private TextDisplay label;
        private final NamespacedKey key=new NamespacedKey(plugin,"npc");
        public void spawn(){
            maraChunk=maraLocation().getChunk();
            maraChunk.addPluginChunkTicket(plugin);
            for(Entity e:world().getEntities())if(e.getPersistentDataContainer().has(key))e.remove();
            Location location=maraLocation();
            if(!world().getBlockAt(location.getBlockX(),100,location.getBlockZ()).getType().isSolid()){
                plugin.getLogger().severe("Mara spawn has no solid footing at "+location);return;
            }
            entity=world().spawn(location,Villager.class,v->{v.setAI(false);v.setInvulnerable(true);v.setSilent(true);v.setPersistent(true);v.setRemoveWhenFarAway(false);v.setCollidable(false);v.setGlowing(true);v.customName(Component.text("Mara — preživjela"));v.setCustomNameVisible(true);v.getPersistentDataContainer().set(key,PersistentDataType.STRING,"mara");});
            label=world().spawn(location.clone().add(0,2.45,0),TextDisplay.class,t->{t.text(Component.text("MARA\nDESNI KLIK ZA RAZGOVOR"));t.setBillboard(Display.Billboard.CENTER);t.setSeeThrough(true);t.setShadowed(true);t.setPersistent(true);t.getPersistentDataContainer().set(key,PersistentDataType.STRING,"mara-label");});
        }
        public void ensure(){if(entity==null||!entity.isValid()||label==null||!label.isValid())spawn();}
        public boolean matches(Entity e){return e.getPersistentDataContainer().has(key);}
        public Location location(){return maraLocation();}
        public void remove(){if(entity!=null)entity.remove();if(label!=null)label.remove();if(maraChunk!=null)maraChunk.removePluginChunkTicket(plugin);}
    }
    public AdventureRuntime(WorldAgentPlugin plugin)throws Exception{
        this.plugin=plugin;directory=plugin.getDataFolder().toPath();
        propKey=new NamespacedKey(plugin,"world-prop");choiceKey=new NamespacedKey(plugin,"dialogue-choice");
        model=JsonParser.parseString(Files.readString(directory.resolve("world-model.json"))).getAsJsonObject();
        dialogue=JsonParser.parseString(Files.readString(directory.resolve("dialogue.json"))).getAsJsonObject();
        Path saved=directory.resolve("players.json");
        if(Files.exists(saved)){JsonObject all=JsonParser.parseString(Files.readString(saved)).getAsJsonObject();for(var e:all.entrySet()){var state=gson.fromJson(e.getValue(),Progression.State.class);Progression.event(state,"restart");states.put(UUID.fromString(e.getKey()),state);}}
        if(Files.exists(directory.resolve("resource-pack.sha1")))packHash=Files.readString(directory.resolve("resource-pack.sha1")).trim();
        display=new VanillaDisplay();display.spawn();spawnProps();
        plugin.getServer().getPluginManager().registerEvents(this,plugin);Objects.requireNonNull(plugin.getCommand("village")).setExecutor(this);
        plugin.getServer().getScheduler().runTaskTimer(plugin,this::tick,20,20);
        if(world().getBlockAt(107,100,130).getType().isSolid())world().setSpawnLocation(107,101,130);
        save();
    }
    private World world(){return Objects.requireNonNull(plugin.getServer().getWorld("world"));}
    private Location maraLocation(){return new Location(world(),87.5,101,83.5,90,0);}
    private Progression.State state(Player p){return states.computeIfAbsent(p.getUniqueId(),k->new Progression.State());}
    private void save(){
        try{Path tmp=directory.resolve("players.tmp");try(var out=new FileOutputStream(tmp.toFile())){out.write(gson.toJson(states).getBytes(java.nio.charset.StandardCharsets.UTF_8));out.getFD().sync();}Files.move(tmp,directory.resolve("players.json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
        catch(IOException e){throw new IllegalStateException("Player persistence failed; stop play and inspect disk",e);}
    }
    private JsonObject region(String id){for(JsonElement e:model.getAsJsonArray("regions"))if(e.getAsJsonObject().get("id").getAsString().equals(id))return e.getAsJsonObject();throw new IllegalArgumentException("Unknown region");}
    private boolean inside(Location l,String id){if(l.getWorld()!=world())return false;JsonObject b=region(id).getAsJsonObject("bounds");int[] p={l.getBlockX(),l.getBlockY(),l.getBlockZ()};for(int i=0;i<3;i++)if(p[i]<b.getAsJsonArray("min").get(i).getAsInt()||p[i]>b.getAsJsonArray("max").get(i).getAsInt())return false;return true;}
    private void tell(Player p,String text){p.sendMessage(Component.text("[The Village Below] "+text));}
    private void title(Player p,String heading,String subtitle){p.showTitle(Title.title(Component.text(heading),Component.text(subtitle)));}
    private void objective(Player p){p.sendActionBar(Component.text("CILJ: "+Progression.objective(state(p))));}
    private void apply(Player p,String event){if(Progression.event(state(p),event)){save();objective(p);}}
    private void requirePlace(Player p,String region){if(!inside(p.getLocation(),region))throw new IllegalArgumentException("Ova radnja pripada lokaciji "+region);}
    private void cue(Player p){if(state(p).packStatus.equals("SUCCESSFULLY_LOADED"))p.playSound(p.getLocation(),"worldagent:seal",0.65f,0.7f);else p.playSound(p.getLocation(),Sound.AMBIENT_CAVE,0.65f,0.7f);}
    private Location checkpoint(Player p){return state(p).checkpoint?new Location(world(),109.5,101,37.5,180,0):new Location(world(),107.5,101,130.5,180,0);}
    private void nearMara(Player p){if(p.getWorld()!=world()||p.getLocation().distanceSquared(maraLocation())>144)throw new IllegalArgumentException("Prati kompas i svjetleći trag do Mare.");}
    private ItemStack choice(Material material,String id,String name,String detail){ItemStack item=new ItemStack(material);item.editMeta(m->{m.displayName(Component.text(name));m.lore(List.of(Component.text(detail)));m.getPersistentDataContainer().set(choiceKey,PersistentDataType.STRING,id);});return item;}
    private void talk(Player p){
        nearMara(p);
        if(state(p).stage!=Progression.Stage.PROLOGUE){objective(p);return;}
        title(p,"MARA",dialogue.get("greeting").getAsString());
        Inventory menu=Bukkit.createInventory(null,9,Component.text("Odgovor Mari"));
        menu.setItem(3,choice(Material.EMERALD,"trust","Vjeruj Mari","Prihvati upozorenje i potraži ključ."));
        menu.setItem(5,choice(Material.REDSTONE,"accuse","Optuži Maru","Suoči je s tragovima iz napuštenog sela."));
        p.openInventory(menu);
    }
    private void choose(Player p,String id){
        nearMara(p);if(state(p).stage!=Progression.Stage.PROLOGUE)return;
        state(p).dialogueChoice=id;title(p,"MARA",dialogue.getAsJsonObject("choices").get(id).getAsString());apply(p,"talk");cue(p);
    }
    private void begin(Player p,boolean reset){
        plugin.setActiveMap(p,"abandoned-mine");
        if(reset)states.put(p.getUniqueId(),new Progression.State());else state(p);
        display.ensure();ensureProps();world().getNearbyEntities(new Location(world(),107,106,72),55,14,72).stream().filter(Monster.class::isInstance).forEach(Entity::remove);
        p.setGameMode(GameMode.ADVENTURE);p.teleport(checkpoint(p));p.getInventory().clear();p.resetPlayerTime();p.resetPlayerWeather();p.setWalkSpeed(.2f);p.removePotionEffect(PotionEffectType.DARKNESS);
        ItemStack compass=new ItemStack(Material.COMPASS);compass.editMeta(m->m.displayName(Component.text("Pronađi Maru — preživjelu")));
        p.getInventory().addItem(compass,new ItemStack(Material.IRON_SWORD),new ItemStack(Material.SHIELD),new ItemStack(Material.BREAD,16));p.setCompassTarget(maraLocation());
        p.setHealth(p.getAttribute(Attribute.MAX_HEALTH).getValue());p.setFoodLevel(20);save();cue(p);title(p,"THE VILLAGE BELOW","Prati kompas i bijeli trag do Mare.");objective(p);
    }
    private void marker(String id,Location location,Material icon,String label){
        Chunk chunk=location.getChunk();if(propChunks.add(chunk))chunk.addPluginChunkTicket(plugin);
        Interaction hit=world().spawn(location,Interaction.class,i->{i.setInteractionWidth(1.5f);i.setInteractionHeight(2.2f);i.setResponsive(true);i.setPersistent(true);i.getPersistentDataContainer().set(propKey,PersistentDataType.STRING,id);});
        ItemDisplay item=world().spawn(location.clone().add(0,1.15,0),ItemDisplay.class,d->{d.setItemStack(new ItemStack(icon));d.setGlowing(true);d.setPersistent(true);d.getPersistentDataContainer().set(propKey,PersistentDataType.STRING,id+":icon");});
        TextDisplay text=world().spawn(location.clone().add(0,2.35,0),TextDisplay.class,d->{d.text(Component.text(label));d.setBillboard(Display.Billboard.CENTER);d.setSeeThrough(true);d.setShadowed(true);d.setPersistent(true);d.getPersistentDataContainer().set(propKey,PersistentDataType.STRING,id+":label");});
        propEntities.add(hit);propEntities.add(item);propEntities.add(text);
    }
    private void spawnProps(){
        for(Entity e:world().getEntities())if(e.getPersistentDataContainer().has(propKey))e.remove();propEntities.clear();
        marker("clue",new Location(world(),139.5,101,83.5),Material.TRIPWIRE_HOOK,"KLJUČ PEČATA\nDESNI KLIK");
        marker("lore",new Location(world(),75.5,101,111.5),Material.WRITTEN_BOOK,"ZABRANJENI ZAPIS\nDESNI KLIK");
        marker("puzzle:left",new Location(world(),107.5,101,55.5),Material.CHISELED_DEEPSLATE,"LIJEVI PEČAT");
        marker("puzzle:right",new Location(world(),113.5,101,55.5),Material.CHISELED_DEEPSLATE,"DESNI PEČAT");
    }
    private void ensureProps(){if(propEntities.size()!=12||propEntities.stream().anyMatch(e->!e.isValid()))spawnProps();}
    private void useProp(Player p,String id){
        switch(id){
            case "clue" -> {if(state(p).stage!=Progression.Stage.INVESTIGATE){objective(p);return;}title(p,"KLJUČ PEČATA","Urezani ritam: LIJEVO — DESNO — LIJEVO");apply(p,"clue");p.getInventory().addItem(new ItemStack(Material.TRIPWIRE_HOOK));cue(p);}
            case "lore" -> {if(state(p).lore)return;title(p,"ZABRANJENI ZAPIS","Mi smo zatvorili vrata. Čuvar udara označenu polovicu dvorane.");apply(p,"lore");p.getInventory().addItem(new ItemStack(Material.GOLDEN_APPLE,2));cue(p);}
            case "puzzle:left","puzzle:right" -> {if(state(p).stage!=Progression.Stage.KEY_FOUND){objective(p);return;}apply(p,id);int progress=state(p).stage==Progression.Stage.ROAD_OPEN?3:state(p).puzzleIndex;title(p,"PEČAT",progress==3?"Kamena vrata se otvaraju.":"Ritam "+progress+" / 3");cue(p);}
        }
    }
    @Override public boolean onCommand(CommandSender sender,Command command,String label,String[] args){
        if(!(sender instanceof Player p)){sender.sendMessage("Use MCP gameplay.run_self_test for canonical persistence checks.");return true;}
        try{
            String action=args.length==0?"state":args[0];
            switch(action){
                case "start" -> {if(participants.contains(p.getUniqueId()))resetEncounter();begin(p,true);}
                case "state" -> {tell(p,gson.toJson(state(p)));objective(p);}
                case "talk" -> talk(p);
                case "choose" -> {if(args.length<2||!dialogue.getAsJsonObject("choices").has(args[1]))throw new IllegalArgumentException("Odaberi trust ili accuse.");choose(p,args[1]);}
                case "investigate" -> useProp(p,"clue");
                case "lore" -> useProp(p,"lore");
                case "puzzle" -> {if(args.length<2||!Set.of("left","right").contains(args[1]))throw new IllegalArgumentException("left ili right");useProp(p,"puzzle:"+args[1]);}
                case "camera" -> {if(!p.isOp())throw new IllegalArgumentException("Observer camera requires operator access.");if(args.length<2)throw new IllegalArgumentException("Specify a saved camera ID.");boolean found=false;for(JsonElement e:model.getAsJsonArray("cameras")){JsonObject c=e.getAsJsonObject();if(c.get("id").getAsString().equals(args[1])){var xyz=c.getAsJsonArray("position");p.setGameMode(GameMode.SPECTATOR);p.teleport(new Location(world(),xyz.get(0).getAsDouble(),xyz.get(1).getAsDouble(),xyz.get(2).getAsDouble(),c.get("yaw").getAsFloat(),c.get("pitch").getAsFloat()));p.setPlayerTime(c.get("time").getAsLong(),false);p.setPlayerWeather(c.get("weather").getAsString().equals("clear")?WeatherType.CLEAR:WeatherType.DOWNFALL);tell(p,"Kamera "+args[1]+"; postavi FOV "+c.get("fov")+", sakrij HUD (F1), snimi F2. Automatski capture još nije implementiran.");found=true;break;}}if(!found)throw new IllegalArgumentException("Unknown camera ID");}
                default -> tell(p,"/village start | state | talk | choose trust/accuse | investigate | lore | puzzle left/right");
            }
        }catch(IllegalArgumentException e){tell(p,e.getMessage());}return true;
    }
    @EventHandler public void join(PlayerJoinEvent e){Player p=e.getPlayer();if("three-oh-seven".equals(plugin.activeMap(p)))return;boolean newPlayer=!states.containsKey(p.getUniqueId());if(packHash!=null){p.setResourcePack("http://127.0.0.1:38765/pack",HexFormat.of().parseHex(packHash),"Mali ambijentalni paket za The Village Below",false);}plugin.getServer().getScheduler().runTaskLater(plugin,()->{if(!p.isOnline()||"three-oh-seven".equals(plugin.activeMap(p)))return;if(newPlayer||state(p).stage==Progression.Stage.PROLOGUE)begin(p,false);else{plugin.setActiveMap(p,"abandoned-mine");title(p,"THE VILLAGE BELOW","Nastavljaš od posljednjeg cilja.");objective(p);}},20);}
    @EventHandler public void pack(PlayerResourcePackStatusEvent e){if(!plugin.isActive(e.getPlayer(),"abandoned-mine"))return;state(e.getPlayer()).packStatus=e.getStatus().name();save();}
    @EventHandler public void interact(PlayerInteractEntityEvent e){
        if(!plugin.isActive(e.getPlayer(),"abandoned-mine"))return;
        if(display.matches(e.getRightClicked())){e.setCancelled(true);talk(e.getPlayer());return;}
        String id=e.getRightClicked().getPersistentDataContainer().get(propKey,PersistentDataType.STRING);if(id!=null&&!id.endsWith(":icon")&&!id.endsWith(":label")){e.setCancelled(true);useProp(e.getPlayer(),id);}
    }
    @EventHandler public void inventory(InventoryClickEvent e){if(!(e.getWhoClicked() instanceof Player p)||!plugin.isActive(p,"abandoned-mine")||e.getCurrentItem()==null)return;String id=e.getCurrentItem().getItemMeta().getPersistentDataContainer().get(choiceKey,PersistentDataType.STRING);if(id==null)return;e.setCancelled(true);p.closeInventory();choose(p,id);}
    @EventHandler(ignoreCancelled=true) public void move(PlayerMoveEvent e){
        Player p=e.getPlayer();if(!plugin.isActive(p,"abandoned-mine")||p.getGameMode()==GameMode.SPECTATOR||e.getTo()==null)return;
        if(freezeUntil.getOrDefault(p.getUniqueId(),0L)>System.currentTimeMillis()){if(e.hasChangedPosition())e.setCancelled(true);return;}
        var s=state(p);
        if(inside(e.getTo(),"mine.entrance")&&s.stage.ordinal()<Progression.Stage.ROAD_OPEN.ordinal()){
            e.setCancelled(true);if(System.currentTimeMillis()-messageTimes.getOrDefault(p.getUniqueId(),0L)>3000){tell(p,"Pečat odbija prolaz. Pronađi ključ i dovrši ritam na putu.");messageTimes.put(p.getUniqueId(),System.currentTimeMillis());}return;
        }
        if(inside(e.getTo(),"mine.chamber")&&s.stage.ordinal()<Progression.Stage.READY.ordinal()){e.setCancelled(true);return;}
        if(inside(e.getTo(),"mine.entrance")&&s.stage==Progression.Stage.ROAD_OPEN){
            apply(p,"checkpoint");freezeUntil.put(p.getUniqueId(),System.currentTimeMillis()+2500);p.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,50,0));cue(p);tell(p,"Zvuk ispod zemlje: Niste trebali vratiti ključ.");
            plugin.getServer().getScheduler().runTaskLater(plugin,()->{if(p.isOnline())tell(p,"Vrata su otvorena iznutra. Nastavi prema odaji.");},45);
        }
        if(inside(e.getTo(),"mine.chamber")&&s.stage==Progression.Stage.READY){apply(p,"encounter");participants.add(p.getUniqueId());if(boss==null)spawnBoss();else bossBar.addPlayer(p);}
    }
    private void spawnBoss(){
        phase=1;boss=world().spawn(new Location(world(),109.5,101,9.5),Zombie.class,z->{z.customName(Component.text("Čuvar pečata"));z.setCustomNameVisible(true);z.setPersistent(false);z.setRemoveWhenFarAway(false);z.setShouldBurnInDay(false);z.getAttribute(Attribute.MAX_HEALTH).setBaseValue(80);z.setHealth(80);z.getAttribute(Attribute.MOVEMENT_SPEED).setBaseValue(0.23);z.getEquipment().setHelmet(new ItemStack(Material.IRON_HELMET));});
        bossBar=Bukkit.createBossBar("Čuvar pečata — faza 1",BarColor.PURPLE,BarStyle.SOLID);for(UUID id:participants){Player p=Bukkit.getPlayer(id);if(p!=null)bossBar.addPlayer(p);}
    }
    private void tick(){
        if(++pulse%5==0){display.ensure();ensureProps();}
        for(Player p:Bukkit.getOnlinePlayers()){
            if(!plugin.isActive(p,"abandoned-mine"))continue;
            objective(p);
            if(state(p).stage!=Progression.Stage.PROLOGUE||p.getWorld()!=world())continue;
            Location from=p.getLocation().add(0,1,0),to=maraLocation().add(0,1,0);var direction=to.toVector().subtract(from.toVector());double length=Math.min(24,direction.length());
            if(length>1){direction.normalize();for(double d=3;d<=length;d+=3){Location point=from.clone().add(direction.clone().multiply(d));world().spawnParticle(Particle.END_ROD,point,1,0.05,0.05,0.05,0);}}
        }
        if(boss==null||boss.isDead())return;
        if(participants.stream().noneMatch(id->{Player p=Bukkit.getPlayer(id);return p!=null&&p.isOnline()&&!p.isDead()&&inside(p.getLocation(),"mine.chamber");})){resetEncounter();return;}
        bossBar.setProgress(Math.max(0,Math.min(1,boss.getHealth()/80)));
        if(phase==1&&boss.getHealth()<=40){phase=2;bossBar.setTitle("Čuvar pečata — faza 2: pogledaj tlo");boss.getAttribute(Attribute.MOVEMENT_SPEED).setBaseValue(0.30);for(UUID id:participants){Player p=Bukkit.getPlayer(id);if(p!=null){cue(p);tell(p,"Čuvar razbija pečat. Makni se s označene polovice!");}}}
        if(phase==2&&pulse%4==0){boolean west=(pulse/4)%2==0;UUID currentBoss=boss.getUniqueId();
            for(int x=west?99:110;x<=(west?108:119);x+=2)for(int z=3;z<=23;z+=2)world().spawnParticle(Particle.SOUL_FIRE_FLAME,x+0.5,101.1,z+0.5,1,0,0,0,0);
            for(UUID id:participants){Player p=Bukkit.getPlayer(id);if(p!=null)tell(p,(west?"Zapadna":"Istočna")+" polovica: udar za 1 sekundu!");}
            plugin.getServer().getScheduler().runTaskLater(plugin,()->{if(boss==null||!boss.getUniqueId().equals(currentBoss))return;for(UUID id:participants){Player p=Bukkit.getPlayer(id);if(p!=null&&inside(p.getLocation(),"mine.chamber")&&(p.getX()<110)==west)p.damage(5,boss);}},20);
        }
    }
    @EventHandler public void bossDeath(EntityDeathEvent e){if(boss!=null&&e.getEntity().getUniqueId().equals(boss.getUniqueId())){e.getDrops().clear();e.setDroppedExp(0);for(UUID id:participants){Player p=Bukkit.getPlayer(id);if(p!=null){apply(p,"boss-defeated");cue(p);}}boss=null;participants.clear();if(bossBar!=null)bossBar.removeAll();}}
    @EventHandler public void death(PlayerDeathEvent e){if(!plugin.isActive(e.getPlayer(),"abandoned-mine")||!states.containsKey(e.getPlayer().getUniqueId()))return;e.setKeepInventory(true);e.getDrops().clear();if(participants.contains(e.getPlayer().getUniqueId()))resetEncounter();else{Progression.event(state(e.getPlayer()),"death");save();}}
    @EventHandler public void respawn(PlayerRespawnEvent e){if(plugin.isActive(e.getPlayer(),"abandoned-mine")&&states.containsKey(e.getPlayer().getUniqueId()))e.setRespawnLocation(checkpoint(e.getPlayer()));}
    @EventHandler public void quit(PlayerQuitEvent e){if(plugin.isActive(e.getPlayer(),"abandoned-mine")&&participants.contains(e.getPlayer().getUniqueId()))resetEncounter();}
    private void resetEncounter(){if(boss!=null){boss.remove();boss=null;}if(bossBar!=null)bossBar.removeAll();for(UUID id:new HashSet<>(participants)){var s=states.get(id);if(s!=null)Progression.event(s,"death");Player p=Bukkit.getPlayer(id);if(p!=null&&!p.isDead())p.teleport(checkpoint(p));}participants.clear();save();}
    boolean ownsBoss(Entity entity){return boss!=null&&boss.isValid()&&boss.getUniqueId().equals(entity.getUniqueId());}
    public JsonObject inspect(String playerId){var out=new JsonObject();out.addProperty("onlinePlayers",Bukkit.getOnlinePlayers().size());out.addProperty("savedPlayers",states.size());out.addProperty("bossPhase",boss==null?0:phase);if(playerId!=null)out.add("state",gson.toJsonTree(states.get(UUID.fromString(playerId))));return out;}
    public JsonObject selfTest()throws Exception{
        Progression.selfTest();var s=new Progression.State();for(String e:List.of("talk","clue","puzzle:left","puzzle:right","puzzle:left","checkpoint","encounter"))Progression.event(s,e);
        Path fixture=directory.resolve("progression-fixture.json");Files.writeString(fixture,gson.toJson(s));var loaded=gson.fromJson(Files.readString(fixture),Progression.State.class);Progression.event(loaded,"restart");if(loaded.stage!=Progression.Stage.READY||!loaded.checkpoint)throw new IllegalStateException("Persistence scenario failed");
        display.ensure();ensureProps();if(propEntities.size()!=12||propEntities.stream().anyMatch(e->!e.isValid()))throw new IllegalStateException("World interaction markers missing");
        JsonObject out=new JsonObject();out.addProperty("status","PASS");out.addProperty("coverage","canonical Java transitions + file persistence + physical world prompts on real plugin; NOT player movement/death listener integration");out.addProperty("checks",9);out.addProperty("worldInteractionMarkers",4);return out;
    }
    public void close(){resetEncounter();display.remove();for(Entity e:propEntities)if(e.isValid())e.remove();for(Chunk c:propChunks)c.removePluginChunkTicket(plugin);propEntities.clear();propChunks.clear();save();}
}
