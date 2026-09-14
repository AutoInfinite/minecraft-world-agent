package dev.worldagent;

/** Deterministic story state for the solo 3:07 test map. */
public final class ThreeOhSevenProgression {
    public enum Stage { WAKE, HALL, STAIR, COURTYARD, STREET, PHONE, PLAYGROUND, ALLEY, RETURN, HOME, COMPLETE }
    public static final class State {
        public Stage stage=Stage.WAKE;
        public long startedAt,completedAt;
    }
    public static boolean event(State state,String event){
        Stage next=switch(event){
            case "clock" -> state.stage==Stage.WAKE?Stage.HALL:null;
            case "hall" -> state.stage==Stage.HALL?Stage.STAIR:null;
            case "lobby" -> state.stage==Stage.STAIR?Stage.COURTYARD:null;
            case "rabbit" -> state.stage==Stage.COURTYARD?Stage.STREET:null;
            case "corner" -> state.stage==Stage.STREET?Stage.PHONE:null;
            case "phone" -> state.stage==Stage.PHONE?Stage.PLAYGROUND:null;
            case "music-box" -> state.stage==Stage.PLAYGROUND?Stage.ALLEY:null;
            case "alley" -> state.stage==Stage.ALLEY?Stage.RETURN:null;
            case "back-door" -> state.stage==Stage.RETURN?Stage.HOME:null;
            case "bed" -> state.stage==Stage.HOME?Stage.COMPLETE:null;
            default -> throw new IllegalArgumentException("Unknown 3:07 event "+event);
        };
        if(next==null)return false;state.stage=next;return true;
    }
    public static String objective(State state){return switch(state.stage){
        case WAKE -> "Pogledaj sat kraj Lukina praznog kreveta.";
        case HALL -> "Luka je izašao. Slijedi ga do stubišta.";
        case STAIR -> "Koraci su kat niže. Siđi u predvorje.";
        case COURTYARD -> "Pronađi što je Luka ispustio u dvorištu.";
        case STREET -> "Figura skreće prema uspavanoj ulici.";
        case PHONE -> "Mrtva govornica zvoni. Podigni slušalicu.";
        case PLAYGROUND -> "Lukina melodija dolazi s igrališta.";
        case ALLEY -> "Prati mokre tragove kroz servisni prolaz.";
        case RETURN -> "Telefon: Luka spava kod kuće. Vrati se na stražnja vrata.";
        case HOME -> "Popni se u stan 307 i provjeri krevet.";
        case COMPLETE -> "03:08. Ne okreći se prema mokrim koracima.";
    };}
    public static void selfTest(){
        State state=new State();require(!event(state,"bed"),"ending cannot be skipped");
        for(String event:new String[]{"clock","hall","lobby","rabbit","corner","phone","music-box","alley","back-door","bed"})require(event(state,event),"event rejected: "+event);
        require(state.stage==Stage.COMPLETE,"story did not complete");require(!event(state,"bed"),"ending repeated");
    }
    private static void require(boolean value,String message){if(!value)throw new IllegalStateException("3:07 progression self-test: "+message);}
}
