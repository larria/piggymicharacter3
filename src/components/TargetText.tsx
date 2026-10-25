export function TargetText({text,target}:{text:string;target:string}) {
 if(!target)return <>{text}</>;
 return <>{text.split(target).map((part,index)=><span key={index}>{index>0&&<mark className="target-character">{target}</mark>}{part}</span>)}</>;
}
