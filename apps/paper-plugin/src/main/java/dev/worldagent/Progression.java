package dev.worldagent;

/** Canonical gameplay state is independent of Minecraft entities and NPC presentation. */
public final class Progression {
    public enum Stage { PROLOGUE, INVESTIGATE, KEY_FOUND, ROAD_OPEN, READY, ENCOUNTER, COMPLETE }
    public static final class State {
        public Stage stage=Stage.PROLOGUE;
        public boolean lore, checkpoint;
        public int puzzleIndex;
        public String dialogueChoice="", packStatus="NOT_REQUESTED";
    }
    public static boolean event(State s,String event){
        switch(event){
            case "talk" -> {if(s.stage==Stage.PROLOGUE){s.stage=Stage.INVESTIGATE;return true;}}
            case "clue" -> {if(s.stage==Stage.INVESTIGATE){s.stage=Stage.KEY_FOUND;return true;}}
            case "lore" -> {if(!s.lore){s.lore=true;return true;}}
            case "puzzle:left", "puzzle:right" -> {
                if(s.stage!=Stage.KEY_FOUND)return false;
                String[] sequence={"puzzle:left","puzzle:right","puzzle:left"};
                if(event.equals(sequence[s.puzzleIndex])){s.puzzleIndex++;if(s.puzzleIndex==sequence.length){s.stage=Stage.ROAD_OPEN;s.puzzleIndex=0;}}
                else s.puzzleIndex=0;
                return true;
            }
            case "checkpoint" -> {if(s.stage==Stage.ROAD_OPEN){s.stage=Stage.READY;s.checkpoint=true;return true;}}
            case "encounter" -> {if(s.stage==Stage.READY){s.stage=Stage.ENCOUNTER;return true;}}
            case "boss-defeated" -> {if(s.stage==Stage.ENCOUNTER){s.stage=Stage.COMPLETE;return true;}}
            case "death", "restart" -> {if(s.stage==Stage.ENCOUNTER){s.stage=Stage.READY;return true;}}
            default -> throw new IllegalArgumentException("Unknown progression event "+event);
        }return false;
    }
    public static String objective(State s){return switch(s.stage){
        case PROLOGUE -> "Pronađi Maru. Drži kompas i prati bijeli trag.";
        case INVESTIGATE -> "Pronađi svjetleći ključ u kovačnici istočno od trga.";
        case KEY_FOUND -> "Na putu prema rudniku aktiviraj kamenje: LIJEVO, DESNO, LIJEVO.";
        case ROAD_OPEN -> "Uđi u rudnik. Pečat je otvoren.";
        case READY -> "Checkpoint spremljen. Uđi u odaju ispod sela.";
        case ENCOUNTER -> "Porazi Čuvara pečata; izbjegavaj označenu polovicu arene.";
        case COMPLETE -> "Selo je svjesno zatvorilo Čuvara. Sada znaš istinu. Kraj prvog prototipa.";
    };}
    public static void selfTest(){
        State s=new State();require(!event(s,"boss-defeated"),"ending cannot be skipped");require(!event(s,"checkpoint"),"checkpoint cannot be skipped");
        event(s,"talk");event(s,"clue");event(s,"puzzle:right");require(s.puzzleIndex==0,"wrong puzzle resets");
        event(s,"puzzle:left");event(s,"puzzle:right");event(s,"puzzle:left");require(s.stage==Stage.ROAD_OPEN,"puzzle opens route");
        event(s,"checkpoint");event(s,"encounter");event(s,"death");require(s.stage==Stage.READY&&s.checkpoint,"death retains checkpoint");
        event(s,"encounter");event(s,"restart");require(s.stage==Stage.READY,"restart resets encounter");
        event(s,"lore");event(s,"encounter");event(s,"boss-defeated");require(s.stage==Stage.COMPLETE&&s.lore,"complete with optional lore");
    }
    private static void require(boolean b,String msg){if(!b)throw new IllegalStateException("Progression self-test: "+msg);}
}
