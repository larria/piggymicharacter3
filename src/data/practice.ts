// Small, hand-reviewed practice set. Distractors cannot complete the given scene.
export interface Practice { char: string; pinyin: string; word: string; sentence: string; characters: string[]; words: string[]; theme: '家庭' | '小学' | '篮球' | '魔方' | '生活' }
export const practice: Practice[] = [
 {char:'爸',pinyin:'bà',word:'爸爸',sentence:'爸爸是我的父亲。',characters:['妈','姐','弟'],words:['妈妈','姐姐','弟弟'],theme:'家庭'},
 {char:'妈',pinyin:'mā',word:'妈妈',sentence:'妈妈是我的母亲。',characters:['爸','哥','妹'],words:['爸爸','哥哥','妹妹'],theme:'家庭'},
 {char:'爷',pinyin:'yé',word:'爷爷',sentence:'爷爷是爸爸的爸爸。',characters:['妈','姐','弟'],words:['妈妈','姐姐','弟弟'],theme:'家庭'},
 {char:'外',pinyin:'wài',word:'外婆',sentence:'外婆是妈妈的妈妈。',characters:['爸','书','球'],words:['爸爸','书包','篮球'],theme:'家庭'},
 {char:'牌',pinyin:'pái',word:'扑克牌',sentence:'玩24点时，我们从扑克牌里抽出四张。',characters:['书','球','水'],words:['书包','篮球','水杯'],theme:'生活'},
 {char:'书',pinyin:'shū',word:'书包',sentence:'上学时，我把课本装进书包。',characters:['球','水','树'],words:['篮球','水杯','树叶'],theme:'小学'},
 {char:'笔',pinyin:'bǐ',word:'铅笔',sentence:'我用铅笔写字，写错了可以用橡皮擦掉。',characters:['米','门','云'],words:['大米','木门','白云'],theme:'小学'},
 {char:'课',pinyin:'kè',word:'课本',sentence:'上语文课时，我们打开语文课本。',characters:['球','水','饭'],words:['篮球','水杯','米饭'],theme:'小学'},
 {char:'篮',pinyin:'lán',word:'篮球',sentence:'篮球比赛时，投进篮筐就能得分。',characters:['足','排','羽'],words:['足球','排球','羽毛球'],theme:'篮球'},
 {char:'球',pinyin:'qiú',word:'篮球',sentence:'篮球比赛时，投进篮筐就能得分。',characters:['书','饭','水'],words:['书包','米饭','水杯'],theme:'篮球'},
 {char:'投',pinyin:'tóu',word:'投篮',sentence:'打篮球时，把球扔向篮筐叫投篮。',characters:['读','吃','睡'],words:['读书','吃饭','睡觉'],theme:'篮球'},
 {char:'魔',pinyin:'mó',word:'魔方',sentence:'我转动魔方，把每一面还原成同一种颜色。',characters:['书','水','饭'],words:['书包','水杯','米饭'],theme:'魔方'},
 {char:'方',pinyin:'fāng',word:'魔方',sentence:'我转动魔方，把每一面还原成同一种颜色。',characters:['水','饭','树'],words:['水杯','米饭','树叶'],theme:'魔方'},
 {char:'转',pinyin:'zhuǎn',word:'转动',sentence:'玩魔方时，用手转动它的各层。',characters:['吃','睡','喝'],words:['吃饭','睡觉','喝水'],theme:'魔方'},
 {char:'水',pinyin:'shuǐ',word:'喝水',sentence:'口渴了，我拿起水杯喝水。',characters:['书','球','树'],words:['读书','投篮','扫地'],theme:'生活'},
 {char:'饭',pinyin:'fàn',word:'米饭',sentence:'煮熟的大米变成了米饭。',characters:['水','书','球'],words:['水杯','书包','篮球'],theme:'生活'},
 {char:'洗',pinyin:'xǐ',word:'洗手',sentence:'吃饭前，我用肥皂和清水洗手。',characters:['读','投','睡'],words:['读书','投篮','睡觉'],theme:'生活'},
];
export const practiceByCharacter = new Map(practice.map(item => [item.char, item]));
