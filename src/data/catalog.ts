import source from './source.json';
import type {Word} from '../domain';
import { practice, practiceByCharacter } from './practice';
import { getVerifiedPinyinContext } from '../pinyin';
import { exampleOverrides } from './exampleOverrides';
function applyExampleOverrides(word: Word): Word {
 const sentences = exampleOverrides[word.char];
 if (!sentences || teachingSentences[word.char]) return word;
 const context = getVerifiedPinyinContext(word.char, word.pinyin);
 if (practiceByCharacter.has(word.char) || !sentences.length || sentences.some(s => !s.includes(word.char)) || (context && !sentences.some(s => s.includes(context.word)))) throw new Error(`例句修订与目标读音词境不一致：${word.char}`);
 return {...word, sentences:[...sentences]};
}
// Finite teaching-context corrections, not a pronunciation audit of the whole source library.
// The selected word must agree with the shared context used by prompts and speech cues.
const teachingSentences: Readonly<Record<string, string>> = {
 曲:'我最喜欢的歌曲有优美的旋律。',
 闷:'比赛输了，他闷闷不乐地坐着。',
 假:'公园里的假山是用石头堆成的。',
 哗:'图书馆里请保持安静，不要喧哗。',
 子:'父母关心自己的子女。',
 啦:'好啦，我们可以出发了！',
 漂:'小船顺着河水漂流。',
 挑:'我在书架上挑选喜欢的故事书。',
 炸:'油炸食物要用热油烹制。',
 杆:'学校的旗杆上飘着五星红旗。',
};
/** Keep teaching defaults lexical and explicit, independent of unrelated practice questions. */
function synchronizeReading(word: Word): Word {
 const pinyin = word.char === '啦' ? 'la' : word.pinyin;
 const context = getVerifiedPinyinContext(word.char, pinyin);
 if (!context) return word;
 const explicitSentence = teachingSentences[word.char];
 const sentences = explicitSentence ? [explicitSentence] : word.sentences.filter(sentence => sentence.includes(context.word));
 return {...word, pinyin:context.pinyin, words:[context.word], sentences:sentences.length ? sentences : [`我会读词语“${context.word}”。`]};
}
export const corrections=['虫：来源 english_honetic 拼写归一为 english_phonetic。','乐：过滤不含目标字的英文中文例句。','有限多音语境覆盖将教学词例、词句与目录读音同步；例如歌曲 qǔ、闷闷不乐 mèn、假山 jiǎ、喧哗 huá、子女 zǐ，句末助词啦用轻声 la；漂流、挑选、油炸、旗杆只保留指定词境，大统一大象。有限覆盖与结构测试不表示全库词例已经人工或词典核验，未覆盖来源词例仍待语义核验。'];
export const catalog:Word[]=source.map((item)=>{ const curated = practiceByCharacter.get(item.character); return {id:item.character,char:item.character,pinyin:curated?.pinyin ?? item.pinyin,words:curated ? [curated.word] : item.example_words.filter(w=>w.includes(item.character)),sentences:curated ? [curated.sentence] : item.example_sentences.filter(s=>s.includes(item.character)&&/[一-鿿]/.test(s))}; }).concat(practice.filter(p => !source.some(item => item.character === p.char)).map(p => ({id:p.char,char:p.char,pinyin:p.pinyin,words:[p.word],sentences:[p.sentence]}))).map(synchronizeReading).map(applyExampleOverrides).sort((a,b) => { const order = (char:string) => { const index = practice.findIndex(p => p.char === char); return index < 0 ? practice.length : index; }; return order(a.char)-order(b.char); });
export const sourceCredit=`原始1290字及其拼音、词句来自授权 data-full-all.json，进行字段归一化与无效例句过滤；原始 source.json 保持不变。另补“牌”“魔”两字；为${practice.length}个不同字自编家庭、小学、篮球、魔方与常见生活精选练习，每字两种不同情境、每题三个干扰项，逐项人工核验语义。结构自动测试不能替代人工语义审查；未精选题为带读音辅助练习。`;