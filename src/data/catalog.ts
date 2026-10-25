import source from './source.json';
import type {Word} from '../domain';
import { practice, practiceByCharacter } from './practice';
import { getVerifiedPinyinContext } from '../pinyin';
/** Keep teaching defaults lexical and explicit, independent of unrelated practice questions. */
function synchronizeReading(word: Word): Word {
 const context = getVerifiedPinyinContext(word.char, word.pinyin);
 if (!context) return word;
 const sentences = word.sentences.filter(sentence => sentence.includes(context.word));
 return {...word, pinyin:context.pinyin, words:[context.word], sentences:sentences.length ? sentences : [`我会读词语“${context.word}”。`]};
}
export const corrections=['虫：来源 english_honetic 拼写归一为 english_phonetic。','乐：过滤不含目标字的英文中文例句。','已核验多音语境的教学词例与词句按目录读音同步；例如种花 zhòng、数量 liàng、回应 yìng、转身 zhuǎn。语境表不是完整多音词典。'];
export const catalog:Word[]=source.map((item)=>{ const curated = practiceByCharacter.get(item.character); return {id:item.character,char:item.character,pinyin:curated?.pinyin ?? item.pinyin,words:curated ? [curated.word] : item.example_words.filter(w=>w.includes(item.character)),sentences:curated ? [curated.sentence] : item.example_sentences.filter(s=>s.includes(item.character)&&/[一-鿿]/.test(s))}; }).concat(practice.filter(p => !source.some(item => item.character === p.char)).map(p => ({id:p.char,char:p.char,pinyin:p.pinyin,words:[p.word],sentences:[p.sentence]}))).map(synchronizeReading).sort((a,b) => { const order = (char:string) => { const index = practice.findIndex(p => p.char === char); return index < 0 ? practice.length : index; }; return order(a.char)-order(b.char); });
export const sourceCredit=`原始1290字及其拼音、词句来自授权 data-full-all.json，进行字段归一化与无效例句过滤；原始 source.json 保持不变。另补“牌”“魔”两字；为${practice.length}个不同字自编家庭、小学、篮球、魔方与常见生活精选练习，每字两种不同情境、每题三个干扰项，逐项人工核验语义。结构自动测试不能替代人工语义审查；未精选题为带读音辅助练习。`;