package dev.worldagent;

import com.google.gson.*;
import net.kyori.adventure.text.Component;
import org.bukkit.*;
import org.bukkit.entity.*;
import org.bukkit.inventory.ItemStack;
import org.bukkit.inventory.meta.LeatherArmorMeta;
import org.bukkit.persistence.PersistentDataType;
import java.io.IOException;
import java.nio.file.Files;
import java.util.*;

/** A visible server-owned authoring avatar. It is deliberately not a Player. */
final class ObserverAvatar {
    private record Camera(String mapId,String id,double x,double y,double z,float yaw,float pitch) {}
    private final WorldAgentPlugin plugin;
    private final NamespacedKey key;
    private final Map<String,Camera> cameras=new LinkedHashMap<>();
    private ArmorStand avatar;
    private TextDisplay label;
    private Chunk chunk;
    private Camera current;

    ObserverAvatar(WorldAgentPlugin plugin)throws IOException {
        this.plugin=plugin;key=new NamespacedKey(plugin,"codex-observer");
        load("world-model.json","abandoned-mine");load("three-oh-seven-world.json","three-oh-seven");
        if(cameras.isEmpty())throw new IllegalStateException("OBSERVER_CAMERAS_MISSING");
        place("three-oh-seven","three07-courtyard");
    }
    private World world(){return Objects.requireNonNull(plugin.getServer().getWorld("world"));}
    private void load(String file,String mapId)throws IOException {
        JsonObject model=JsonParser.parseString(Files.readString(plugin.getDataFolder().toPath().resolve(file))).getAsJsonObject();
        for(JsonElement entry:model.getAsJsonArray("cameras")){
            JsonObject value=entry.getAsJsonObject();JsonArray p=value.getAsJsonArray("position");
            Camera camera=new Camera(mapId,value.get("id").getAsString(),p.get(0).getAsDouble(),p.get(1).getAsDouble(),p.get(2).getAsDouble(),value.get("yaw").getAsFloat(),value.get("pitch").getAsFloat());
            if(cameras.put(mapId+":"+camera.id,camera)!=null)throw new IllegalStateException("DUPLICATE_OBSERVER_CAMERA");
        }
    }
    private ItemStack leather(Material material,Color color){ItemStack item=new ItemStack(material);LeatherArmorMeta meta=(LeatherArmorMeta)item.getItemMeta();meta.setColor(color);item.setItemMeta(meta);return item;}
    private void spawn(Location location){
        for(Entity entity:world().getEntities())if(owns(entity))entity.remove();
        avatar=world().spawn(location,ArmorStand.class,stand->{
            stand.setArms(true);stand.setBasePlate(false);stand.setGravity(false);stand.setInvulnerable(true);stand.setSilent(true);stand.setCollidable(false);stand.setPersistent(true);
            stand.customName(Component.text("CODEX • OBSERVER"));stand.setCustomNameVisible(false);stand.getPersistentDataContainer().set(key,PersistentDataType.STRING,"avatar");
            stand.getEquipment().setHelmet(leather(Material.LEATHER_HELMET,Color.fromRGB(35,45,54)));stand.getEquipment().setChestplate(leather(Material.LEATHER_CHESTPLATE,Color.fromRGB(35,45,54)));stand.getEquipment().setLeggings(leather(Material.LEATHER_LEGGINGS,Color.fromRGB(59,73,86)));stand.getEquipment().setBoots(leather(Material.LEATHER_BOOTS,Color.fromRGB(24,30,37)));
        });
        label=world().spawn(location.clone().add(0,2.25,0),TextDisplay.class,text->{text.text(Component.text("CODEX\nOBSERVER"));text.setBillboard(Display.Billboard.CENTER);text.setSeeThrough(true);text.setShadowed(true);text.setPersistent(true);text.getPersistentDataContainer().set(key,PersistentDataType.STRING,"label");});
    }
    private void retainChunk(Location location){Chunk next=location.getChunk();if(chunk!=null&&!chunk.equals(next))chunk.removePluginChunkTicket(plugin);if(!next.equals(chunk))next.addPluginChunkTicket(plugin);chunk=next;}
    JsonObject place(String mapId,String cameraId){
        Camera next=cameras.get(mapId+":"+cameraId);if(next==null)throw new IllegalArgumentException("UNKNOWN_OBSERVER_CAMERA");
        // Saved poses describe a player-eye camera. The visible avatar stands one block lower on its footing.
        Location location=new Location(world(),next.x,next.y-1,next.z,next.yaw,next.pitch);
        if(avatar==null||!avatar.isValid()||label==null||!label.isValid())spawn(location);else{avatar.teleport(location);label.teleport(location.clone().add(0,2.25,0));}
        retainChunk(location);current=next;return inspect();
    }
    void ensure(){if(current!=null&&(avatar==null||!avatar.isValid()||label==null||!label.isValid()))place(current.mapId,current.id);}
    boolean owns(Entity entity){return entity.getPersistentDataContainer().has(key,PersistentDataType.STRING);}
    JsonObject inspect(){
        JsonObject out=new JsonObject();out.addProperty("present",avatar!=null&&avatar.isValid());out.addProperty("kind","SERVER_AVATAR_NOT_PLAYER");out.addProperty("renderer",false);out.addProperty("canBlockBuildTransactions",false);
        if(current!=null){out.addProperty("mapId",current.mapId);out.addProperty("cameraId",current.id);out.add("position",new Gson().toJsonTree(new double[]{current.x,current.y,current.z}));out.add("rotation",new Gson().toJsonTree(new float[]{current.yaw,current.pitch}));}
        return out;
    }
    void close(){if(avatar!=null&&avatar.isValid())avatar.remove();if(label!=null&&label.isValid())label.remove();if(chunk!=null)chunk.removePluginChunkTicket(plugin);avatar=null;label=null;chunk=null;}
}
