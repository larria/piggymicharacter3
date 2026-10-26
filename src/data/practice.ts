// 人工逐项核验：每字有两个不同情境，三个干扰项均不能合理填入对应空位。
// 结构测试只检查完整性，不能代替人工语义审查；题干的剩余目标字由 domain 遮罩。
export interface Practice {
 char: string; pinyin: string; word: string; sentence: string;
 characterSentence?: string; wordSentence?: string;
 characters: string[]; words: string[];
 theme: '家庭' | '小学' | '篮球' | '魔方' | '生活';
}
export const PRACTICE_VERSION = 'life-reviewed-45-v2';
export const practice: Practice[] = [
 {char:'爸',pinyin:'bà',word:'爸爸',sentence:'爸爸是我的父亲。',characterSentence:'我叫父亲一声爸爸。',characters:['妈','姐','弟'],words:['妈妈','姐姐','弟弟'],theme:'家庭'},
 {char:'妈',pinyin:'mā',word:'妈妈',sentence:'妈妈是我的母亲。',characterSentence:'我叫母亲一声妈妈。',characters:['爸','哥','妹'],words:['爸爸','哥哥','妹妹'],theme:'家庭'},
 {char:'爷',pinyin:'yé',word:'爷爷',sentence:'爷爷是爸爸的爸爸。',characterSentence:'我把父亲的父亲叫作爷爷。',characters:['妈','姐','弟'],words:['妈妈','姐姐','弟弟'],theme:'家庭'},
 {char:'外',pinyin:'wài',word:'外婆',sentence:'外婆是妈妈的妈妈。',characterSentence:'妈妈的母亲是我的外婆。',characters:['爸','书','球'],words:['爸爸','书包','篮球'],theme:'家庭'},
 {char:'牌',pinyin:'pái',word:'扑克牌',sentence:'玩24点时，我们从扑克牌里抽出四张。',characterSentence:'扑克牌上有红桃和黑桃。',characters:['书','球','水'],words:['书包','篮球','水杯'],theme:'生活'},
 {char:'书',pinyin:'shū',word:'书包',sentence:'上学时，我把课本装进书包。',characterSentence:'书本里印着故事和插图。',characters:['球','水','树'],words:['篮球','水杯','树叶'],theme:'小学'},
 {char:'笔',pinyin:'bǐ',word:'铅笔',sentence:'我用铅笔写字，写错了可以用橡皮擦掉。',characterSentence:'毛笔的尖端有柔软的毛，可以蘸墨写字。',characters:['米','门','云'],words:['大米','木门','白云'],theme:'小学'},
 {char:'课',pinyin:'kè',word:'课本',sentence:'上语文课时，我们打开语文课本。',characterSentence:'上课铃响了，同学们坐好听讲。',characters:['球','水','饭'],words:['篮球','水杯','米饭'],theme:'小学'},
 {char:'篮',pinyin:'lán',word:'篮球',sentence:'篮球比赛时，投进篮筐就能得分。',characterSentence:'打篮球要把球投进高处的圆筐。',characters:['足','排','羽'],words:['足球','排球','羽毛球'],theme:'篮球'},
 {char:'球',pinyin:'qiú',word:'篮球',sentence:'篮球比赛时，投进篮筐就能得分。',characterSentence:'足球是用脚踢的圆形运动器材。',characters:['书','饭','水'],words:['书包','米饭','水杯'],theme:'篮球'},
 {char:'投',pinyin:'tóu',word:'投篮',sentence:'打篮球时，把球扔向篮筐叫投篮。',characterSentence:'我把篮球投进篮筐，得了两分。',characters:['读','吃','睡'],words:['读书','吃饭','睡觉'],theme:'篮球'},
 {char:'魔',pinyin:'mó',word:'魔方',sentence:'我转动魔方，把每一面还原成同一种颜色。',characterSentence:'三阶魔方的每一面有九个小色块。',characters:['书','水','饭'],words:['书包','水杯','米饭'],theme:'魔方'},
 {char:'方',pinyin:'fāng',word:'魔方',sentence:'魔方的每一面都是正方形。',characterSentence:'正方形有四条一样长的边和四个直角。',characters:['水','饭','树'],words:['水杯','米饭','树叶'],theme:'魔方'},
 {char:'转',pinyin:'zhuǎn',word:'转身',sentence:'听见身后有人叫我，我转身看向他。',characterSentence:'我转过身，原来在背后的门就到了眼前。',characters:['吃','睡','喝'],words:['吃饭','睡觉','喝水'],theme:'魔方'},
 {char:'水',pinyin:'shuǐ',word:'喝水',sentence:'口渴了，我拿起水杯喝水。',characterSentence:'水龙头打开后，清凉的液体流进杯子。',characters:['书','球','树'],words:['读书','投篮','扫地'],theme:'生活'},
 {char:'饭',pinyin:'fàn',word:'米饭',sentence:'煮熟的大米变成了米饭。',characterSentence:'电饭锅里正在煮大米。',characters:['水','书','球'],words:['水杯','书包','篮球'],theme:'生活'},
 {char:'洗',pinyin:'xǐ',word:'洗手',sentence:'吃饭前，我用肥皂和清水洗手。',characterSentence:'我用清水洗掉苹果表面的泥。',characters:['读','投','睡'],words:['读书','投篮','睡觉'],theme:'生活'},
 {char:'人',pinyin:'rén',word:'人们',sentence:'人们用语言交谈，表达自己的想法。',characterSentence:'一个成年人通常有两只手和两只脚。',characters:['木','火','米'],words:['石头','雨滴','树叶'],theme:'生活'},
 {char:'手',pinyin:'shǒu',word:'双手',sentence:'我的双手各有五根手指。',characterSentence:'手掌连着五根手指。',characters:['耳','足','目'],words:['耳朵','双脚','眼睛'],theme:'生活'},
 {char:'耳',pinyin:'ěr',word:'耳朵',sentence:'耳朵能听见声音。',characterSentence:'耳机戴好后，我听到了音乐。',characters:['米','田','火'],words:['膝盖','牙齿','脚趾'],theme:'生活'},
 {char:'目',pinyin:'mù',word:'双目',sentence:'双目就是两只眼睛。',characterSentence:'目录列出书中各章的名称和页码。',characters:['火','米','牛'],words:['双手','双脚','耳朵'],theme:'生活'},
 {char:'日',pinyin:'rì',word:'日出',sentence:'清晨，太阳从地平线升起，这叫日出。',characterSentence:'日历上标着每个月的日期。',characters:['牛','米','手'],words:['下雪','落叶','涨潮'],theme:'生活'},
 {char:'月',pinyin:'yuè',word:'月亮',sentence:'月亮绕着地球转，自己不会发光。',characterSentence:'一个月通常有三十天或三十一天，二月除外。',characters:['门','牛','米'],words:['太阳','台灯','蜡烛'],theme:'生活'},
 {char:'山',pinyin:'shān',word:'山顶',sentence:'爬到山顶，就到了这座山最高的地方。',characterSentence:'高山耸立在平地之上。',characters:['米','手','门'],words:['山脚','山腰','海底'],theme:'生活'},
 {char:'田',pinyin:'tián',word:'稻田',sentence:'稻田里种着水稻，成熟后能收获稻谷。',characterSentence:'农民在田里播种庄稼。',characters:['耳','门','火'],words:['书包','客厅','球场'],theme:'生活'},
 {char:'木',pinyin:'mù',word:'木头',sentence:'木头是从树干或树枝得到的材料。',characterSentence:'木桌是用树木的材料做成的桌子。',characters:['耳','米','月'],words:['玻璃','铁块','塑料'],theme:'生活'},
 {char:'火',pinyin:'huǒ',word:'火苗',sentence:'蜡烛点燃后，烛芯上冒出火苗。',characterSentence:'发生火灾时，要远离燃烧的地方并求救。',characters:['米','木','耳'],words:['冰块','稻谷','雨滴'],theme:'生活'},
 {char:'土',pinyin:'tǔ',word:'泥土',sentence:'蚯蚓在松软的泥土里钻来钻去。',characterSentence:'土壤能让植物扎根，吸收水分。',characters:['手','耳','牛'],words:['玻璃','火苗','钢板'],theme:'生活'},
 {char:'大',pinyin:'dà',word:'大象',sentence:'大象有长鼻子和粗壮的四条腿。',characterSentence:'同样的杯子，大杯比小杯装得多。',characters:['耳','田','雨'],words:['小鸟','金鱼','蚂蚁'],theme:'生活'},
 {char:'小',pinyin:'xiǎo',word:'小麦',sentence:'小麦的籽粒磨成面粉，可以做面条。',characterSentence:'同样的衣服，小号比大号尺寸更小。',characters:['火','耳','田'],words:['石头','玻璃','棉花'],theme:'生活'},
 {char:'上',pinyin:'shàng',word:'上楼',sentence:'我从一楼走到二楼，这叫上楼。',characterSentence:'上坡时，我从低处向高处走。',characters:['耳','米','牛'],words:['下楼','睡觉','洗手'],theme:'生活'},
 {char:'下',pinyin:'xià',word:'下楼',sentence:'我从二楼走到一楼，这叫下楼。',characterSentence:'下坡时，我从高处向低处走。',characters:['耳','米','牛'],words:['上楼','睡觉','洗手'],theme:'生活'},
 {char:'天',pinyin:'tiān',word:'天空',sentence:'白云飘在高高的天空中。',characterSentence:'一天有二十四小时。',characters:['耳','米','门'],words:['海底','地洞','抽屉'],theme:'生活'},
 {char:'雨',pinyin:'yǔ',word:'雨伞',sentence:'下雨时，我撑开雨伞挡住落下的雨滴。',characterSentence:'雨点从云中落到地上，把地面打湿了。',characters:['耳','米','牛'],words:['铅笔','篮球','米饭'],theme:'生活'},
 {char:'门',pinyin:'mén',word:'大门',sentence:'进院子前，我推开院墙上的大门。',characterSentence:'门铃响了，我去给客人开门。',characters:['米','耳','山'],words:['铅笔','篮球','米饭'],theme:'生活'},
 {char:'米',pinyin:'mǐ',word:'大米',sentence:'稻谷去掉外壳后得到大米，可以煮饭。',characterSentence:'米粒在锅里加水煮熟后就成了饭。',characters:['耳','门','手'],words:['石头','玻璃','木头'],theme:'生活'},
 {char:'口',pinyin:'kǒu',word:'口腔',sentence:'口腔里有牙齿和舌头。',characterSentence:'我张开口，露出了牙齿。',characters:['耳','田','木'],words:['耳朵','膝盖','手掌'],theme:'生活'},
 {char:'足',pinyin:'zú',word:'足球',sentence:'踢足球时，把球踢进对方球门可以得分。',characterSentence:'足迹是脚踩过后留下的印子。',characters:['耳','米','火'],words:['篮球','排球','乒乓球'],theme:'生活'},
 {char:'鸟',pinyin:'niǎo',word:'小鸟',sentence:'小鸟有羽毛，还有两只翅膀。',characterSentence:'鸟巢是长着羽毛的动物孵蛋和育雏的地方。',characters:['鱼','牛','羊'],words:['金鱼','小狗','山羊'],theme:'生活'},
 {char:'鱼',pinyin:'yú',word:'金鱼',sentence:'金鱼用鳃呼吸，在鱼缸里摆动尾巴游泳。',characterSentence:'鱼鳃能帮助水中的这种动物呼吸。',characters:['鸟','牛','羊'],words:['小鸟','小狗','山羊'],theme:'生活'},
 {char:'车',pinyin:'chē',word:'汽车',sentence:'汽车沿公路行驶，用轮子载人前进。',characterSentence:'车轮沿着路面滚动，带着车辆前进。',characters:['耳','米','田'],words:['轮船','飞机','潜艇'],theme:'生活'},
 {char:'花',pinyin:'huā',word:'花瓣',sentence:'花瓣围在花蕊周围，常有鲜艳的颜色。',characterSentence:'花蕊长在花的中央，有的能产生花粉。',characters:['米','耳','牛'],words:['树根','鸟翅','鱼鳞'],theme:'生活'},
 {char:'牛',pinyin:'niú',word:'奶牛',sentence:'奶牛能产出我们喝的牛奶。',characterSentence:'牛犊是刚出生不久的小牛。',characters:['鸟','鱼','狗'],words:['金鱼','小鸟','蜜蜂'],theme:'生活'},
 {char:'羊',pinyin:'yáng',word:'绵羊',sentence:'绵羊身上的毛可以剪下来纺成羊毛线。',characterSentence:'羊羔是刚出生不久的小羊。',characters:['鸟','鱼','狗'],words:['金鱼','小鸟','乌龟'],theme:'生活'},
 {char:'狗',pinyin:'gǒu',word:'小狗',sentence:'小狗汪汪叫，还会摇尾巴。',characterSentence:'狗粮是专门给汪汪叫的动物吃的食物。',characters:['鸟','鱼','羊'],words:['小鸟','金鱼','绵羊'],theme:'生活'},
];
export const practiceByCharacter = new Map(practice.map(item => [item.char, item]));
