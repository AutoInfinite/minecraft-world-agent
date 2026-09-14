package dev.worldagent;

import com.google.gson.*;
import org.bukkit.*;
import org.bukkit.command.*;
import org.bukkit.entity.*;
import org.bukkit.event.*;
import org.bukkit.event.entity.PlayerDeathEvent;
import org.bukkit.event.player.*;
import org.bukkit.inventory.ItemStack;
import org.bukkit.persistence.PersistentDataType;
import org.bukkit.potion.*;
import net.kyori.adventure.text.Component;
import net.kyori.adventure.title.Title;
import java.io.*;
import java.nio.file.*;
import java.util.*;

/** Solo, no-combat runtime for the short 3:07 horror map. */
public final class ThreeOhSevenRuntime implements Listener, CommandExecutor {
    private static final String MAP_ID="three-oh-seven";
    private final WorldAgentPlugin plugin;
    private final Gson gson=new Gson();
    private final Path directory;
    private final JsonObject model;
    private final Map<UUID,ThreeOhSevenProgression.State> states=new HashMap<>();
    private final NamespacedKey entityKey;
    private final List<Entity> props=new ArrayList<>();
    private final Set<Chunk> chunks=new HashSet<>();
    private ArmorStand echo;
    private int pulse;

    public ThreeOhSevenRuntime(WorldAgentPlugin plugin)throws Exception{
        this.plugin=plugin;directory=plugin.getDataFolder().toPath();entityKey=new NamespacedKey(plugin,"three-oh-seven-entity");
        model=JsonParser.parseString(Files.readString(directory.resolve("three-oh-seven-world.json"))).getAsJsonObject();
        Path saved=directory.resolve("players-three-oh-seven.json");
        if(Files.exists(saved)){JsonObject all=JsonParser.parseString(Files.readString(saved)).getAsJsonObject();for(var e:all.entrySet())states.put(UUID.fromString(e.getKey()),gson.fromJson(e.getValue(),ThreeOhSevenProgression.State.class));}
        cleanupOwned();
        plugin.getServer().getPluginManager().registerEvents(this,plugin);Objects.requireNonNull(plugin.getCommand("threeam")).setExecutor(this);
        plugin.getServer().getScheduler().runTaskTimer(plugin,this::tick,20,20);
    }
    private World world(){return Objects.requireNonNull(plugin.getServer().getWorld("world"));}
    private ThreeOhSevenProgression.State state(Player player){return states.computeIfAbsent(player.getUniqueId(),id->new ThreeOhSevenProgression.State());}
    private void save(){
        try{JsonObject all=new JsonObject();states.forEach((id,state)->all.add(id.toString(),gson.toJsonTree(state)));Path tmp=directory.resolve("players-three-oh-seven.tmp");try(var out=new FileOutputStream(tmp.toFile())){out.write(gson.toJson(all).getBytes(java.nio.charset.StandardCharsets.UTF_8));out.getFD().sync();}Files.move(tmp,directory.resolve("players-three-oh-seven.json"),StandardCopyOption.ATOMIC_MOVE,StandardCopyOption.REPLACE_EXISTING);}
        catch(IOException e){throw new IllegalStateException("3:07 player persistence failed",e);}
    }
    private boolean inside(Location l,int x1,int y1,int z1,int x2,int y2,int z2){return l.getWorld()==world()&&l.getX()>=x1&&l.getX()<x2+1&&l.getY()>=y1&&l.getY()<y2+1&&l.getZ()>=z1&&l.getZ()<z2+1;}
    private void tell(Player player,String text){player.sendMessage(Component.text("[3:07] "+text));}
    private void title(Player player,String heading,String subtitle){player.showTitle(Title.title(Component.text(heading),Component.text(subtitle)));}
    private void objective(Player player){player.sendActionBar(Component.text("CILJ: "+ThreeOhSevenProgression.objective(state(player))));}
    private void sound(Player player,Sound sound,float volume,float pitch){player.playSound(player.getLocation(),sound,volume,pitch);}
    private void advance(Player player,String event){if(ThreeOhSevenProgression.event(state(player),event)){save();objective(player);positionEcho(state(player).stage);}}
    private ItemStack named(Material material,String name){ItemStack item=new ItemStack(material);item.editMeta(meta->meta.displayName(Component.text(name)));return item;}
    private Location start(){return new Location(world(),195.5,111,121.5,180,3);}
    private Location checkpoint(ThreeOhSevenProgression.Stage stage){return switch(stage){
        case WAKE,HALL -> start();case STAIR -> new Location(world(),181.5,111,102.5,180,18);
        case COURTYARD -> new Location(world(),196.5,101,112.5,-90,0);case STREET -> new Location(world(),205.5,101,112.5,-90,0);
        case PHONE -> new Location(world(),221.5,101,112.5,-90,0);case PLAYGROUND -> new Location(world(),228.5,101,107.5,180,0);
        case ALLEY -> new Location(world(),233.5,101,128.5,90,0);case RETURN -> new Location(world(),207.5,101,128.5,90,0);
        case HOME,COMPLETE -> new Location(world(),181.5,111,103.5,0,0);
    };}
    private void begin(Player player,boolean reset){
        if(world().getBlockAt(192,110,121).getType().isAir())throw new IllegalArgumentException("Mapa još nije izgrađena; pokreni npm run build:threeam.");
        for(Player other:Bukkit.getOnlinePlayers())if(other!=player&&plugin.isActive(other,MAP_ID))throw new IllegalArgumentException("3:07 je zasad solo iskustvo; drugi igrač je već unutra.");
        if(reset||!states.containsKey(player.getUniqueId())){ThreeOhSevenProgression.State fresh=new ThreeOhSevenProgression.State();fresh.startedAt=System.currentTimeMillis();states.put(player.getUniqueId(),fresh);}
        plugin.setActiveMap(player,MAP_ID);ensureProps();positionEcho(state(player).stage);
        player.setGameMode(GameMode.ADVENTURE);player.teleport(reset?start():checkpoint(state(player).stage));player.getInventory().clear();
        player.getInventory().addItem(named(Material.CLOCK,"03:07"),named(Material.LANTERN,"Lukina noćna svjetiljka"));
        player.setPlayerTime(19500,false);player.setPlayerWeather(WeatherType.DOWNFALL);player.setWalkSpeed(0.18f);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,24,0));
        title(player,"3:07","Ulazna vrata upravo su kliknula.");sound(player,Sound.BLOCK_WOODEN_DOOR_CLOSE,0.55f,0.62f);save();objective(player);
    }
    private void marker(String id,Location location,Material icon,String label){
        if(world().getBlockAt(location.getBlockX(),location.getBlockY()-1,location.getBlockZ()).getType().isAir())throw new IllegalStateException("3:07 marker has no floor: "+id);
        Chunk chunk=location.getChunk();if(chunks.add(chunk))chunk.addPluginChunkTicket(plugin);
        Interaction hit=world().spawn(location,Interaction.class,e->{e.setInteractionWidth(1.4f);e.setInteractionHeight(2f);e.setResponsive(true);e.setPersistent(true);e.getPersistentDataContainer().set(entityKey,PersistentDataType.STRING,id);});
        ItemDisplay item=world().spawn(location.clone().add(0,1.05,0),ItemDisplay.class,e->{e.setItemStack(new ItemStack(icon));e.setGlowing(true);e.setPersistent(true);e.getPersistentDataContainer().set(entityKey,PersistentDataType.STRING,id+":item");});
        TextDisplay text=world().spawn(location.clone().add(0,2.1,0),TextDisplay.class,e->{e.text(Component.text(label));e.setBillboard(Display.Billboard.CENTER);e.setSeeThrough(true);e.setShadowed(true);e.setPersistent(true);e.getPersistentDataContainer().set(entityKey,PersistentDataType.STRING,id+":label");});
        props.add(hit);props.add(item);props.add(text);
    }
    private void ensureProps(){
        if(props.size()==18&&props.stream().allMatch(Entity::isValid))return;cleanupProps();
        marker("clock",new Location(world(),195.5,111,117.5),Material.CLOCK,"03:07  •  DESNI KLIK");
        marker("rabbit",new Location(world(),205.5,101,116.5),Material.RABBIT_HIDE,"CRVENI ZEC  •  DESNI KLIK");
        marker("phone",new Location(world(),228.5,101,103.5),Material.BELL,"GOVORNICA  •  DESNI KLIK");
        marker("music-box",new Location(world(),230.5,101,128.5),Material.MUSIC_DISC_11,"GLAZBENA KUTIJA  •  DESNI KLIK");
        marker("back-door",new Location(world(),196.5,101,124.5),Material.ENDER_EYE,"TELEFON ZVONI  •  DESNI KLIK");
        marker("bed",new Location(world(),190.5,111,121.5),Material.WHITE_BED,"LUKIN KREVET  •  DESNI KLIK");
    }
    private void cleanupProps(){for(Entity entity:props)if(entity.isValid())entity.remove();props.clear();}
    private void cleanupOwned(){for(Entity entity:world().getEntities())if(entity.getPersistentDataContainer().has(entityKey))entity.remove();props.clear();echo=null;}
    private void positionEcho(ThreeOhSevenProgression.Stage stage){
        if(stage==ThreeOhSevenProgression.Stage.WAKE||stage==ThreeOhSevenProgression.Stage.HOME){removeEcho();return;}
        Location location=switch(stage){
            case HALL -> new Location(world(),181.5,111,102.5,180,0);case STAIR -> new Location(world(),183.5,101,113.5,0,0);
            case COURTYARD -> new Location(world(),205.5,101,112.5,-90,0);case STREET -> new Location(world(),220.5,101,112.5,-90,0);
            case PHONE -> new Location(world(),234.5,101,109.5,180,0);case PLAYGROUND -> new Location(world(),233.5,101,128.5,90,0);
            case ALLEY -> new Location(world(),207.5,101,128.5,90,0);case RETURN -> new Location(world(),194.5,101,124.5,180,0);
            case COMPLETE -> new Location(world(),187.5,111,121.5,-90,0);default -> null;
        };
        if(location==null){removeEcho();return;}if(echo==null||!echo.isValid()){
            echo=world().spawn(location,ArmorStand.class,a->{a.setSmall(true);a.setArms(true);a.setBasePlate(false);a.setGravity(false);a.setInvulnerable(true);a.setSilent(true);a.setCollidable(false);a.setPersistent(true);a.getPersistentDataContainer().set(entityKey,PersistentDataType.STRING,"echo");a.getEquipment().setHelmet(new ItemStack(Material.PLAYER_HEAD));a.getEquipment().setChestplate(new ItemStack(Material.LEATHER_CHESTPLATE));a.getEquipment().setLeggings(new ItemStack(Material.LEATHER_LEGGINGS));a.getEquipment().setBoots(new ItemStack(Material.LEATHER_BOOTS));});
        }else echo.teleport(location);
    }
    private void removeEcho(){if(echo!=null&&echo.isValid())echo.remove();echo=null;}
    private void use(Player player,String id){
        var stage=state(player).stage;
        switch(id){
            case "clock" -> {if(stage!=ThreeOhSevenProgression.Stage.WAKE){objective(player);return;}advance(player,"clock");title(player,"LUKA?","Mala figura prolazi hodnikom.");sound(player,Sound.BLOCK_WOODEN_DOOR_OPEN,.5f,.7f);}
            case "rabbit" -> {if(stage!=ThreeOhSevenProgression.Stage.COURTYARD){objective(player);return;}advance(player,"rabbit");title(player,"LUKIN ZEC","Mokar je. Trag vodi prema ulici.");sound(player,Sound.ENTITY_RABBIT_AMBIENT,.35f,.55f);}
            case "phone" -> {if(stage!=ThreeOhSevenProgression.Stage.PHONE){objective(player);return;}advance(player,"phone");title(player,"LUKIN GLAS","Tata… nemoj se okretati.");sound(player,Sound.BLOCK_BELL_USE,.7f,.55f);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,35,0));}
            case "music-box" -> {if(stage!=ThreeOhSevenProgression.Stage.PLAYGROUND){objective(player);return;}advance(player,"music-box");title(player,"USPAVANKA","Melodija svira bez ključa.");sound(player,Sound.MUSIC_DISC_11,.3f,1.45f);}
            case "back-door" -> {if(stage!=ThreeOhSevenProgression.Stage.RETURN){objective(player);return;}advance(player,"back-door");removeEcho();title(player,"POZIV IZ STANA","Luka spava kraj mene. Gdje si ti?");sound(player,Sound.BLOCK_BELL_RESONATE,.65f,.55f);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,45,0));}
            case "bed" -> {if(stage!=ThreeOhSevenProgression.Stage.HOME){objective(player);return;}advance(player,"bed");state(player).completedAt=System.currentTimeMillis();save();title(player,"LUKA SPAVA","Krevet je topao. Mokri koraci staju iza tebe.");sound(player,Sound.AMBIENT_CAVE,.8f,.5f);plugin.getServer().getScheduler().runTaskLater(plugin,()->{if(player.isOnline()&&plugin.isActive(player,MAP_ID)){positionEcho(ThreeOhSevenProgression.Stage.COMPLETE);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,55,0));title(player,"03:08","Nešto te pratilo kući.");sound(player,Sound.ENTITY_WARDEN_HEARTBEAT,.55f,.7f);}},55);}
        }
    }
    @Override public boolean onCommand(CommandSender sender,Command command,String label,String[] args){
        if(!(sender instanceof Player player)){sender.sendMessage("3:07 is a player experience; use gameplay.run_self_test for state checks.");return true;}
        try{String action=args.length==0?"state":args[0];switch(action){
            case "start","reset" -> begin(player,true);
            case "state" -> {tell(player,gson.toJson(state(player)));objective(player);}
            case "camera" -> camera(player,args);
            default -> tell(player,"/threeam start | reset | state | camera <id>");
        }}catch(IllegalArgumentException|IllegalStateException e){tell(player,e.getMessage());}return true;
    }
    private void camera(Player player,String[] args){
        if(!player.isOp())throw new IllegalArgumentException("Observer camera requires operator access.");if(args.length<2)throw new IllegalArgumentException("Navedi camera ID.");
        for(JsonElement element:model.getAsJsonArray("cameras")){JsonObject camera=element.getAsJsonObject();if(!camera.get("id").getAsString().equals(args[1]))continue;var xyz=camera.getAsJsonArray("position");player.setGameMode(GameMode.SPECTATOR);player.teleport(new Location(world(),xyz.get(0).getAsDouble(),xyz.get(1).getAsDouble(),xyz.get(2).getAsDouble(),camera.get("yaw").getAsFloat(),camera.get("pitch").getAsFloat()));player.setPlayerTime(camera.get("time").getAsLong(),false);player.setPlayerWeather(WeatherType.DOWNFALL);tell(player,"Kamera "+args[1]+"; postavi FOV "+camera.get("fov")+", F1 pa F2.");return;}throw new IllegalArgumentException("Unknown camera ID");
    }
    @EventHandler public void join(PlayerJoinEvent event){Player player=event.getPlayer();if(!plugin.isActive(player,MAP_ID))return;plugin.getServer().getScheduler().runTaskLater(plugin,()->{if(player.isOnline()&&plugin.isActive(player,MAP_ID))begin(player,false);},20);}
    @EventHandler public void interact(PlayerInteractEntityEvent event){Player player=event.getPlayer();if(!plugin.isActive(player,MAP_ID))return;String id=event.getRightClicked().getPersistentDataContainer().get(entityKey,PersistentDataType.STRING);if(id==null||id.contains(":")||id.equals("echo"))return;event.setCancelled(true);use(player,id);}
    @EventHandler(ignoreCancelled=true) public void move(PlayerMoveEvent event){
        Player player=event.getPlayer();if(!plugin.isActive(player,MAP_ID)||event.getTo()==null||!event.hasChangedPosition())return;var stage=state(player).stage;Location to=event.getTo();
        if(stage==ThreeOhSevenProgression.Stage.HALL&&inside(to,177,110,99,184,117,106)){advance(player,"hall");title(player,"KAT 3","Koraci su sada ispod tebe.");sound(player,Sound.BLOCK_IRON_DOOR_CLOSE,.45f,.55f);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,30,0));}
        else if(stage==ThreeOhSevenProgression.Stage.STAIR&&inside(to,178,101,108,185,104,115)){advance(player,"lobby");title(player,"PREDVORJE","Luka stoji pod jedinim svjetlom u dvorištu.");sound(player,Sound.WEATHER_RAIN_ABOVE,.35f,.75f);}
        else if(stage==ThreeOhSevenProgression.Stage.STREET&&inside(to,218,101,104,224,104,114)){advance(player,"corner");title(player,"JEDAN UGAO ISPRED","Govornica koja godinama ne radi počinje zvoniti.");sound(player,Sound.BLOCK_BELL_USE,.35f,.45f);}
        else if(stage==ThreeOhSevenProgression.Stage.ALLEY&&inside(to,204,101,126,215,104,131)){advance(player,"alley");title(player,"NE OKREĆI SE","Koraci iza tebe nastavljaju kada staneš.");sound(player,Sound.ENTITY_WARDEN_STEP,.45f,.72f);player.addPotionEffect(new PotionEffect(PotionEffectType.DARKNESS,50,0));}
    }
    private void tick(){
        if(++pulse%5==0&&Bukkit.getOnlinePlayers().stream().anyMatch(p->plugin.isActive(p,MAP_ID)))ensureProps();
        for(Player player:Bukkit.getOnlinePlayers())if(plugin.isActive(player,MAP_ID)){objective(player);if(pulse%9==0&&state(player).stage.ordinal()>=ThreeOhSevenProgression.Stage.STREET.ordinal()&&state(player).stage.ordinal()<ThreeOhSevenProgression.Stage.HOME.ordinal())sound(player,Sound.BLOCK_POINTED_DRIPSTONE_DRIP_WATER,.16f,.65f);}
    }
    @EventHandler public void death(PlayerDeathEvent event){Player player=event.getPlayer();if(!plugin.isActive(player,MAP_ID))return;event.setKeepInventory(true);event.getDrops().clear();}
    @EventHandler public void respawn(PlayerRespawnEvent event){Player player=event.getPlayer();if(plugin.isActive(player,MAP_ID))event.setRespawnLocation(checkpoint(state(player).stage));}
    @EventHandler public void quit(PlayerQuitEvent event){if(plugin.isActive(event.getPlayer(),MAP_ID))removeEcho();}
    public JsonObject inspect(String playerId){JsonObject out=new JsonObject();out.addProperty("map",MAP_ID);out.addProperty("onlineParticipants",Bukkit.getOnlinePlayers().stream().filter(p->plugin.isActive(p,MAP_ID)).count());out.addProperty("savedPlayers",states.size());out.addProperty("markers",props.size()/3);out.addProperty("echoPresent",echo!=null&&echo.isValid());if(playerId!=null)out.add("state",gson.toJsonTree(states.get(UUID.fromString(playerId))));return out;}
    public JsonObject selfTest(){ThreeOhSevenProgression.selfTest();JsonObject out=new JsonObject();out.addProperty("status","PASS");out.addProperty("checks",12);out.addProperty("coverage","canonical 3:07 state transitions and runtime construction; real player timing, movement listeners and renderer remain unverified");return out;}
    public void close(){removeEcho();cleanupProps();for(Chunk chunk:chunks)chunk.removePluginChunkTicket(plugin);chunks.clear();save();}
}
