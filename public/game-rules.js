export function queryRates(player,state){
 const unlocked=new Set(player.solved||[]);
 const spacing=unlocked.has(1)?(player.spacing||0)/100:0;
 const variety=(unlocked.has(2)?player.variety:25)/100;
 const verification=unlocked.has(3)?(player.verification||0)/100:0;
 const level=state.levels[state.level],unit=state.pace*40/state.duration;
 // Spacing lowers the actual request rate; it does not bypass the cap.
 const requests=player.speed*(1-.5*spacing);
 const throughput=requests*(state.level>=3?1-.4*verification:1);
 const cleanliness=state.level>=3?.4+.6*verification:1;
 const data=player.gain>=30?0:throughput*.105*(1.15-.35*variety)*Math.max(.35,1-player.gain/50)*cleanliness;
 const coverage=player.coverage>=100?0:throughput*variety*.11*cleanliness;
 const speedRisk=level.speed?Math.max(0,requests-6)*7:0;
 const repeatRisk=level.repetition?Math.max(0,.55-variety)*60:0;
 return {requests:throughput,data:data*unit,coverage:coverage*unit,gain:((player.bank+player.gain)*.72+player.coverage*.28)>=100?0:(data*.72+coverage*.28)*unit,suspicion:((speedRisk+repeatRisk)*state.detection-9)*unit,speedRisk,repeatRisk,cleanliness};
}
