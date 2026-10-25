export interface Pinyin { syllable: string; tone: number }
// Orthographic single syllables, not a polyphonic reading dictionary.
const syllables = new Set(`a ai an ang ao o ou e ei en eng er m n ng
ba bai ban bang bao bei ben beng bi bian biao bie bin bing bo bu
pa pai pan pang pao pei pen peng pi pian piao pie pin ping po pou pu
ma mai man mang mao me mei men meng mi mian miao mie min ming miu mo mou mu
fa fan fang fei fen feng fo fou fu
da dai dan dang dao de dei den deng di dia dian diao die ding diu dong dou du duan dui dun duo
ta tai tan tang tao te teng ti tian tiao tie ting tong tou tu tuan tui tun tuo
na nai nan nang nao ne nei nen neng ni nian niang niao nie nin ning niu nong nou nu nuan nuo nü nüe
la lai lan lang lao le lei leng li lia lian liang liao lie lin ling liu lo long lou lu luan lun luo lü lüe
ga gai gan gang gao ge gei gen geng gong gou gu gua guai guan guang gui gun guo
ka kai kan kang kao ke ken keng kong kou ku kua kuai kuan kuang kui kun kuo
ha hai han hang hao he hei hen heng hong hou hu hua huai huan huang hui hun huo
ji jia jian jiang jiao jie jin jing jiong jiu ju jue juan jun
qi qia qian qiang qiao qie qin qing qiong qiu qu que quan qun
xi xia xian xiang xiao xie xin xing xiong xiu xu xue xuan xun
zha zhai zhan zhang zhao zhe zhei zhen zheng zhi zhong zhou zhu zhua zhuai zhuan zhuang zhui zhun zhuo
cha chai chan chang chao che chen cheng chi chong chou chu chua chuai chuan chuang chui chun chuo
sha shai shan shang shao she shei shen sheng shi shou shu shua shuai shuan shuang shui shun shuo
ran rang rao re ren reng ri rong rou ru rua ruan rui run ruo
za zai zan zang zao ze zei zen zeng zi zong zou zu zuan zui zun zuo
ca cai can cang cao ce cen ceng ci cong cou cu cuan cui cun cuo
sa sai san sang sao se sen seng si song sou su suan sui sun suo
yi ya yan yang yao ye yin ying yo yong you yu yue yuan yun
wa wai wan wang wei wen weng wo wu`.split(/\s+/));
export function normalizePinyin(input: string): Pinyin | null {
 let text=input.trim().toLowerCase().normalize('NFD').replace(/u:/g,'ü').replace(/v/g,'ü');
 let tone=0, marks=0;
 const digit=text.match(/[0-5]$/); if(digit){tone=Number(digit[0])%5;marks++;text=text.slice(0,-1);}
 let syllable='';
 for(const c of text){const index=['̄','́','̌','̀'].indexOf(c);if(index>=0){if(!/[aeiouünm]$/.test(syllable))return null;tone=index+1;marks++;}else if(c==='̈'){if(!syllable.endsWith('u'))return null;syllable=syllable.slice(0,-1)+'ü';}else if(/[a-z]/.test(c))syllable+=c;else return null;}
 if(marks>1||!syllables.has(syllable))return null;
 return {syllable,tone};
}
export type PinyinTone = 0 | 1 | 2 | 3 | 4;
/** Build an answer only from an untoned single syllable and an explicit tone choice. */
export function buildPinyinAnswer(input: string, selectedTone: PinyinTone | null): string | null {
 if(selectedTone === null || !Number.isInteger(selectedTone) || selectedTone < 0 || selectedTone > 4)return null;
 // Diaeresis is spelling (ü), not tone; reject digits and all other marks before normalization.
 const text=input.trim().toLowerCase().normalize('NFD');
 if(!/^[a-z̈:]+$/.test(text))return null;
 const parsed=normalizePinyin(text);
 return parsed && parsed.tone===0 ? `${parsed.syllable}${selectedTone}` : null;
}
export function matchesPinyin(input:string, expected:string):boolean {const a=normalizePinyin(input),b=normalizePinyin(expected);return !!a&&!!b&&a.syllable===b.syllable&&a.tone===b.tone;}
export interface PinyinContext { char: string; word: string; pinyin: string }
/** Reviewed lexical readings only; containing a character is not pronunciation evidence. */
export const verifiedPinyinContexts: readonly PinyinContext[] = Object.freeze([
 ['乐','快乐','lè'],['乐','音乐','yuè'],['长','长江','cháng'],['长','长大','zhǎng'],
 ['行','行走','xíng'],['行','银行','háng'],['重','重量','zhòng'],['重','重新','chóng'],
 ['朝','朝霞','zhāo'],['朝','朝向','cháo'],['还','还有','hái'],['还','归还','huán'],
 ['得','得到','dé'],['得','跑得快','de'],['得','得去','děi'],['着','看着','zhe'],['着','着火','zháo'],['着','着陆','zhuó'],
 ['地','地面','dì'],['地','慢慢地','de'],['薄','单薄','bó'],['薄','薄饼','báo'],['薄','薄荷','bò'],
 ['藏','躲藏','cáng'],['藏','西藏','zàng'],['数','数字','shù'],['数','数星星','shǔ'],
 ['好','好人','hǎo'],['好','爱好','hào'],['空','天空','kōng'],['空','空地','kòng'],
 ['为','为了','wèi'],['为','成为','wéi'],['教','教室','jiào'],['教','教书','jiāo'],
 ['觉','睡觉','jiào'],['觉','感觉','jué'],['便','方便','biàn'],['便','便宜','pián'],
 ['单','单独','dān'],['参','参加','cān'],['参','人参','shēn'],['解','解决','jiě'],
 ['都','全都','dōu'],['都','首都','dū'],['落','落叶','luò'],['落','丢三落四','là'],['露','露水','lù'],['露','露面','lòu'],
 ['种','种花','zhòng'],['种','种子','zhǒng'],['量','数量','liàng'],['量','测量','liáng'],
 ['背','背包','bēi'],['背','后背','bèi'],['分','分开','fēn'],['分','水分','fèn'],
 ['发','发现','fā'],['发','头发','fà'],['干','干净','gān'],['干','干活','gàn'],
 ['看','看见','kàn'],['看','看守','kān'],['少','多少','shǎo'],['少','少年','shào'],
 ['倒','倒下','dǎo'],['倒','倒水','dào'],['转','转身','zhuǎn'],['转','转圈','zhuàn'],
 ['系','联系','xì'],['系','系鞋带','jì'],['结','结伴','jié'],['结','结实','jiē'],
 ['弹','弹琴','tán'],['弹','子弹','dàn'],['调','调整','tiáo'],['调','调动','diào'],
 ['相','相信','xiāng'],['相','相片','xiàng'],['处','处理','chǔ'],['处','到处','chù'],
 ['角','角落','jiǎo'],['角','角色','jué'],['只','只有','zhǐ'],['只','一只','zhī'],
 ['没','没有','méi'],['没','淹没','mò'],['扇','扇子','shàn'],['扇','扇风','shān'],
 ['似','似乎','sì'],['似','似的','shì'],
 ['中','中间','zhōng'],['中','中奖','zhòng'],['应','应该','yīng'],['应','回应','yìng'],
 ['给','送给','gěi'],['给','供给','jǐ'],['正','正在','zhèng'],['正','正月','zhēng'],
 ['和','和平','hé'],['和','和面','huó'],['和','和药','huò'],['和','应和','hè'],
 ['划','划船','huá'],['划','计划','huà'],['累','劳累','lèi'],['累','积累','lěi'],['累','累赘','léi'],
 ['盛','盛开','shèng'],['盛','盛饭','chéng'],['铺','铺开','pū'],['铺','店铺','pù'],
 ['卷','卷起','juǎn'],['卷','试卷','juàn'],['恶','恶心','ě'],['恶','恶劣','è'],['恶','厌恶','wù'],
 ['哪','哪里','nǎ'],['哪','哪吒','né'],
 ['了','好了','le'],['了','了解','liǎo'],['大','大人','dà'],['大','大夫','dài'],
 ['更','更加','gèng'],['更','更改','gēng'],
 ['兴','高兴','xìng'],['兴','兴奋','xīng'],['泊','停泊','bó'],['泊','湖泊','pō'],
 ['将','将来','jiāng'],['将','将领','jiàng'],['当','当心','dāng'],['当','上当','dàng'],
 ['扫','扫地','sǎo'],['扫','扫帚','sào'],['场','广场','chǎng'],['场','一场雨','cháng'],
 ['担','担心','dān'],['担','重担','dàn'],['宁','安宁','níng'],['宁','宁愿','nìng'],
 ['尽','尽力','jìn'],['尽','尽管','jǐn'],['称','称重','chēng'],['称','称心','chèn'],
 ['宿','宿舍','sù'],['宿','一宿','xiǔ'],['宿','星宿','xiù'],['扎','扎针','zhā'],['扎','扎辫子','zā'],['扎','挣扎','zhá'],
 ['劲','有劲','jìn'],['劲','强劲','jìng'],['省','节省','shěng'],['省','反省','xǐng'],
 ['切','切菜','qiē'],['切','亲切','qiè'],['奔','奔跑','bēn'],['奔','投奔','bèn'],
 ['冲','冲水','chōng'],['冲','冲着','chòng'],['鲜','新鲜','xiān'],['鲜','鲜有','xiǎn'],
 ['燕','燕子','yàn'],['燕','燕山','yān'],['扁','扁平','biǎn'],['扁','扁舟','piān'],
 ['熟','熟悉','shú'],['熟','饭熟了','shóu'],
].map(([char,word,pinyin]) => Object.freeze({char,word,pinyin})));
export function getVerifiedPinyinContext(char: string, pinyin: string): PinyinContext | null {
 return verifiedPinyinContexts.find(context => context.char === char && matchesPinyin(pinyin, context.pinyin)) ?? null;
}
export function resolvePinyinContext(word: {char:string;pinyin:string;words:readonly string[]}): PinyinContext {
 return getVerifiedPinyinContext(word.char, word.pinyin) ?? {char:word.char,word:word.char,pinyin:word.pinyin};
}
export function pinyinContext(word:{char:string;pinyin:string;words:readonly string[]}):string {return resolvePinyinContext(word).word;}
export function parseCoinGift(input:string):number {if(!/^[0-9]+$/.test(input.trim()))throw new Error('请输入正安全整数，不接受小数、负数或指数');const amount=Number(input.trim());if(!Number.isSafeInteger(amount)||amount<=0)throw new Error('请输入正安全整数');return amount;}
