import java.nio.channels.*;
import java.nio.file.*;
import java.util.*;

/** Hold Minecraft's session locks while archiving stopped worlds. No live-copy fallback. */
class ArchiveWorld {
    public static void main(String[] args)throws Exception{
        Path root=Path.of("").toRealPath(),server=root.resolve("server-dev").toRealPath();
        if(args.length!=1||!args[0].matches("[a-zA-Z0-9_.-]+\\.tar"))throw new IllegalArgumentException("A plain .tar filename is required");
        Files.createDirectories(root.resolve(".runtime"));Path output=root.resolve(".runtime").resolve(args[0]);
        if(Files.exists(output))throw new IllegalArgumentException("Archive already exists");
        List<FileChannel> channels=new ArrayList<>();List<FileLock> locks=new ArrayList<>();List<String> worlds=new ArrayList<>();
        try{
            for(String name:List.of("world","world_nether","world_the_end")){
                Path dir=server.resolve(name);if(!Files.isDirectory(dir))continue;
                if(!dir.toRealPath().startsWith(server))throw new IllegalStateException("World escaped project");
                FileChannel channel=FileChannel.open(dir.resolve("session.lock"),StandardOpenOption.WRITE);channels.add(channel);
                FileLock lock=channel.tryLock();if(lock==null)throw new IllegalStateException("World is running; stop Paper cleanly before archiving");locks.add(lock);worlds.add(name);
            }
            if(worlds.isEmpty())throw new IllegalStateException("No world exists");
            List<String> command=new ArrayList<>(List.of("tar","-cf",output.toString(),"--exclude=*/session.lock","-C",server.toString()));command.addAll(worlds);
            int status=new ProcessBuilder(command).inheritIO().start().waitFor();if(status!=0)throw new IllegalStateException("Archive failed: "+status);
            System.out.println(output);
        }finally{for(FileLock lock:locks)lock.release();for(FileChannel c:channels)c.close();}
    }
}
