# 咪猪头识字成长册 · 开发规格

本文描述当前工程实现与运行要求。用户流程和奖励数值的完整说明见[产品规格](./PRODUCT_SPEC.md)，本文不重复产品规则全文。

## 单字里程碑与本次完成庆祝

- 新字第四页仅在保存成功、独立拼音和词语双题形成真实推进证据时显示固定、显著的“恭喜咪猪头，学完「字」啦！”卡片。该字本轮实际账本 XP、已到账币与待下一阶段朗读结算币分开展示；不追加奖励、不更改每日额度或延迟结算。关闭反馈仍保留“学习下一个字／继续练习”。选项和答案快照锁定，单字完成不使用两秒自动跳转；普通拼音正确仍两秒前进。
- 提示作答、辅助题、未独立通过补学不宣称学会。完成会话必须以保存后的 session.completed 和无 currentTask 为准，后续复习／纠错存在时不触发终局。
- 最终全视口完成页覆盖小反馈，诚实表述“完成今天这次练习”，展示实际提交数及当前会话奖励，提供今日／收藏入口。canvas-confetti 懒加载、有限多向发射，画布不截获点击；失败不影响入口，离开清理计时、动画、监听及画布。减少动态用静态星光和勾替代。每个保存完成事件只播放一次礼花与已有 celebrate 音效；result 背景音乐遵守现有音乐／音效开关和浏览器用户激活限制。
- 选项按会话任务身份重新挂载，继续时清除旧焦点；hover 只作用于 `(hover: hover) and (pointer: fine)`，保留 keyboard focus-visible 与真实选中态。真正 iPad 触控悬停问题仍需真机验证。
- 学习与考试填空统一褐色圆角虚线 SVG，随字体缩放并对齐基线。优先渲染安全 segments，多空白与安全 □ fallback 都支持；装饰 SVG aria-hidden，外层“空白待填写”，不在隐藏 DOM 或属性泄露答案。题库与 masked segment 语音逻辑不变。

## 四页反馈与逐页经验（新会话）

- 新会话独立 `xpVersion: 2`，仅未认领新字学习使用逐页经验；旧进行中会话继续旧经验，历史余额和账本不追溯补发，认领验证、复习、考试和成就规则不变。
- 介绍／跟写／拼音／词语成功分别 1／2／1／1 XP；每页失败 1 XP。会话加原始教学来源加页码去重，跟写首次失败 1、随后完成仅补 1。每日 150 XP 上限下也保留已处理结果，跟写升级沿用原日期。逐页来源 coins 为零，不占旧来源额度，不进入语音延迟奖励。
- 底部固定米白圆角学习反馈独立于普通 toast，仅显示持久化成功后的实际 XP 和已到账币；关闭不取消答对计时，失败关闭后保留固定继续入口。小屏预留底部空间并支持 safe-area。
- 介绍真实朗读完成或终止失败后等待十秒显示结果，取消或过期回调不授奖；跟写保留原示范门控并手动“试一试”。实际错误笔迹提示不重复刷奖，取消指针和资料故障不算失败。
- 拼音与第四页词语均保留提交前题目、输入／选项快照，锁定重复提交；答对两秒后继续，答错手动继续。退出、暂停、卸载清理自动计时；题目朗读不阻止答题。成功动画只作用于跟写框，笔顺示范画布不闪动。
- 猪头币资格、数量、限额和原目的地语音延迟身份保持不变，不提前显示待到账币。保存失败不前进，允许重新提交。

## 1. 技术栈与运行

项目是纯前端 React 19、TypeScript 5.8、Vite 6 应用，采用 ESM，使用 lucide-react 图标，没有服务端或账号系统。Sharp 是本地图片工具依赖，不在浏览器执行。

```sh
npm install
npm run dev
npm run build
npx vite preview --host 0.0.0.0 --port 4173
npm run deploy
```

`dev` 为 `vite --host 0.0.0.0`，端口以终端输出为准。`build` 执行 `tsc -b && vite build`，输出 `dist/`。`deploy` 通过 `predeploy` 先构建，再用 `gh-pages` 把 `dist/` 发布到仓库 `gh-pages` 分支，站点地址为 https://larria.github.io/piggymicharacter3/ 。TypeScript 使用 strict、ES2022、Bundler 模块解析、React JSX、JSON 模块及 noEmit；检查范围包括 src、tests、vite.config.ts。

## 2. 工程结构

| 路径 | 当前职责 |
| --- | --- |
| `src/main.tsx`、`index.html` | 应用入口 |
| `src/App.tsx` | 页面入口、学习会话、图鉴详情、爸爸空间、声音与备份交互 |
| `src/domain.ts` | 纯学习调度、题目、会话、学习证据与日期计算 |
| `src/domain/growth.ts` | 段位、星级、累计 XP 与晋级门 |
| `src/domain/rewards.ts` | 奖励账本、答题限额与幂等标识 |
| `src/domain/exams.ts` | 小测、晋级资格、试卷和结算 |
| `src/domain/achievements.ts` | 成就、称号、学习日进度 |
| `src/domain/wall.ts` | 收藏墙布局与操作约束 |
| `src/storage.ts` | 版本化本地存储、校验、兼容格式、修订冲突、导入导出 |
| `src/parentGate.ts` | 防误触数学确认题生成 |
| `src/components/CharacterLearning.tsx`、`StrokePlayer.tsx` | 学习呈现及 SVG 笔顺播放器 |
| `src/components/SessionProgress.tsx` | `sessionSummary(state)` 驱动的紧凑题数进度环、帮助与暂停 |
| `src/components/TaskProgressRing.tsx`、`task-progress.css` | 学习和考试共用可访问数字 SVG 题数环与局部样式 |
| `src/components/ExamPanel.tsx`、`GrowthPage.tsx` | 考试与成长视图 |
| `src/components/CollectionPage.tsx`、`CardWall.tsx` | 卡片目录、购买与自由墙 |
| `src/components/AvatarEditor.tsx`、`src/avatarCrop.ts` | 共用头像编辑器与本地裁剪 |
| `src/components/PlayerHeader.tsx`、`XpProgress.tsx`、`GameIcons.tsx` | 头像、经验进度及界面图标 |
| `src/Art.tsx`、`src/style.css`、组件 CSS | 原创艺术、响应式布局与局部样式 |
| `public/sw.js`、`public/manifest.webmanifest` | 生产离线和安装元数据 |

## 3. 字库、题库与数据边界

### 字目录

`src/data/source.json` 是只读来源原表，共 1290 字。`src/data/catalog.ts` 归一化汉字、拼音、词和有效例句，并补充“牌”“魔”，形成 1292 字目录。`虫` 的来源字段 `english_honetic` 被识别为拼写修正，不用于视觉识字；`乐` 不含目标字的来源例句被过滤，不编造教材内容。

`src/data/practice.ts` 提供 45 个不同字的自编精选视觉验证题。每字具有字符题和完整词题两个不同情境及干扰项；`characterSentence` 用于字符题，词题使用 `wordSentence ?? sentence`。domain 生成结构化遮罩并移除题干残留目标字，朗读使用遮罩片段而不再次拆分目标字。题库导出 `practice`、`practiceByCharacter`、`PRACTICE_VERSION`。

`src/pinyin.ts` 提供单音节拼音规范化、校验、声调比较、目录读音对应的人工小型词境覆盖及赠币文本解析。新建学习、日常复习、自由复习及认领复用 `createTaskPair`，固定 `:a` pinyin → `:b` word；pair 身份用于首题反馈，不靠 TaskKind 判断。普通双题只有第二题且首题独立正确证据存在才结算掌握和答题预算。结构化 `resolvePinyinContext` 返回目标字、核验词境和读音，题面与答案使用同一条记录；未知词境不从首个随机例词推断读音。buildPinyinAnswer 校验不带调单音节，接受 ü/v/u:，拒绝原始数字与声调符号，并拼接规范音节与所选 0–4 声调。selectedTone 初始 null，与轻声 0 严格区分；五个 aria-pressed 按钮恰好五项（可见为 ˉ、ˊ、ˇ、ˋ、轻声；aria-label 为一声、二声、三声、四声、轻声），不预选答案，触控区域至少 44px，窄屏换行。输入支持 Enter 并阻止输入法组合期间提交，空白/格式错误/未选声调不调用 answerTask；合法答题使用规范化 correct 与现有 hinted、independent、submissionId、奖励和回教逻辑。任务变化或离页清空输入及声调选择，拼音题的 speechText/segments 为空且没有题目朗读按钮，操作帮助仅解释拼音输入与声调选择，不展示目标答案。Session 可选 `flowVersion: 2` 只标记新建双题流程，Task 可选 `pair`、`teachingOrigin`、`retry: 0 | 1` 关联教学状态和原跟写账本；失败／提示最多一次补学双题。普通教学 2+3 XP、普通复习 5 XP 不翻倍，认领奖励预算保留。存档严格校验题序、pair关联、通过日志与来源，版本缺失的旧队列按旧路径恢复，ID、日志、顺序和历史奖励不改；考试校验仍仅允许 character/word，10／30题不变。

`giftCoins(state, amount)` 校验正安全整数及余额溢出，并为待兑现奖励预留安全整数余额空间，只返回增加 coins 的状态，不调用奖励或成就结算。爸爸赠币处理再次检查已解锁且在爸爸页，经 commit/saveState 保存后才清空输入并显示专用赠送提示；失败保留原状态。目标字 CSS 仅 #B86643、透明背景、继承字重，无边框/下划线/阴影/padding，forced-colors 使用 LinkText；教学按认识汉字 intro → 跟写 teach → 试题 quiz 手动前进。intro 展示大字、拼音、词语、例句及单项喇叭；自动完整读三遍汉字、真实词语一次和例句一次后只解锁“开始跟写”，不自动切页。设备失败或不可用从终止结果起等待十秒解锁，不假称朗读成功，不新增学习证据；沿用 |teach 存档奖励门控标识。等待可被重试、暂停、离页及卸载取消，回调校验实际渲染阶段、任务和轮次。跟写静音入场，不展示教学喇叭和例句，跟写奖励直接结算；原跟写完成/合法跳过门槛保留，进入试题仍自动读题。刷新不自动朗读，点击继续恢复，session-top 保留进度和暂停但移除重复标签。

非精选字第二道词题即使存在词句或笔顺也只能进入辅助练习。结构测试可以验证不同字、目标词、选项唯一和遮罩，不替代人工语义审查。加入独立题需要人工确认句意和替换后答案唯一合理，不能只靠通过自动测试。

### 学习与成长实现约束

使用本地日历及可注入日期，而不是简单按 24 小时滚动打卡。学习、考试互斥；持久化任务、试卷、选项、正确答案和题库版本，恢复不能重新抽卷。奖励唯一键防止重复提交和重复结算；XP 与消费币分离，成就币与每日答题奖励分别记账。各段星数、奖励额度、晋级分数见产品规格，以 domain 模块为实际实现依据。掌握计数直接判断 `stage >= 3 && lastAdvanced !== null`，初识判断有效进阶日期，考试资格再要求题库覆盖；不回溯日志证明次数。有效学习日筛选答对、无提示、非 correction，assessment 还需 advanced；旧版普通 review（含小测）不要求进阶；新双题日志 `pairComplete: false` 的首题不计有效学习日或成就，只有整字有效配对通过才计入，字段缺失保留旧日志口径。成就连续指标取历史最长，而 stats 取当前连续。rarity 是配置枚举 common/uncommon/rare/epic/legendary，不按币值或达成率推算。

普通队列按当日全部日志排除已学字，与成就有效日志口径不同。无限练习从已核实字随机取最多 10 字；选字会话去重后要求 1–10 个有效 ID，每字双题。二者不通过普通每日队列配额筛选，但仍受奖励与进阶规则限制。小测十题、晋级三十题分别取不同字，字符/词题各半，试卷不更新 progress。

头像异步裁剪读取最新状态并防止关闭/换卡后提交过期结果；Canvas 生成白底 256×256 JPEG，最大 256 KiB，依次尝试 .9/.8/.65/.5 质量。校验 Data URL/Base64、JPEG 首尾和 SOF 尺寸，但不验证图片确实来自声明卡片。保存失败保留原头像，成功才关闭编辑器；来源卡号不在目录时归一为 null。

## 4. 本地存储与备份

应用通过 localStorage 保存 v2 主状态，包括学习进度、任务、设置、日志、XP、猪头币奖励账本、成就、考试、收藏、头像与 `unlockedWallCount`（缺失时兼容归一为 1，范围 1–10）；收藏墙使用独立存储键和修订号。解锁成本固定为 `[20,30,50,80,120,170,230,300,400]`。备份包含全部墙，不能只复制主状态当作完整用户备份。

当前存储键为 `mizhupig.growth.v2`（主状态）、`mizhupig.wall.v1`（收藏布局；键名保持不变，载荷为 collection v2）、`mizhupig.expedition.v1`（兼容来源）、`mizhupig.pre-v2-backup`（原始备份）、`mizhupig.restore-transaction.v1`（恢复记录）。读取旧 wall v1 `{version:1,revision,items}` 时保留 revision 和第一面布局并扩展为空的新墙；写回为 collection v2 `{version:2,revision,walls}`。

写入先比较 revision，成功后加一；检查与写入不是原子 compare-and-swap，仍可能有同时提交竞争。App 仅监听主状态键：停止播放、退出学习并提示刷新，不自动加载新状态或锁死全部按钮，也不处理 key 为 null 的 clear 通知。墙监听墙键和 clear 通知，阻止保存并提示下载草稿、载入最新；不监听主状态键。因此跨标签更新不是实时合并或完整并发隔离。提交、购买与结算具有幂等标识。浏览器禁止存储、容量不足、异常数据或修订冲突必须显示错误，不静默覆盖。墙拖动使用节流草稿保存，结束立即保存；写入失败保留可导出的内存布局，不报告为已保存。localStorage 和多个键之间不构成数据库事务，实际使用应避免多标签同时操作。

新建状态的 dailyGoal/newLimit/weeklyGoal 为 30/20/5；加载、备份导入及 v1 迁移保留原合法设置，不用默认值覆盖。Session 可带可选 `learningRequired: string[]`，持久化主动进入教学的任务 ID；校验要求唯一且指向当前会话中的 learn 任务，缺失兼容旧数据。`markKnown` 不允许把标记任务转成 assessment。跟写轨迹仅组件内存，完成／跳过／教学阶段与累计前台时间由 `session.practice` 持久化；`teachingOrigin` 保留补学关联的原跟写奖励，第二题 ready 不重复教学。`sessionSummary` 从全部任务及 cursor 后待做任务的不同 wordId 计算总字/完成字/剩余字，补学、双题和延迟纠错均不会虚增完成字；SessionProgress 使用 totalTasks - remainingTasks 作为已完成题数，TaskProgressRing 显示 done/total，空任务显示真实 0/0；role=progressbar 的 max 最小为 1、value 为 0，SVG 为装饰且数值有可访问文本。输入数值归一为有限非负整数，done 不超过 total；组件独立 CSS 支持 forced-colors，不依赖动画。

### 当前支持的备份格式

- **v2**：校验后恢复完整支持状态；恢复替换当前数据前需要确认。
- **v1**：需要明确确认“保留学习、重置奖励”。保留学习进度、设置与日志；奖励、旧贝壳/币、已购卡、称号、考试、墙重置。未完任务保留在原始备份中，根据学习进度重新安排。
- 本地可从 `mizhupig.expedition.v1` 读取兼容来源。处理前保存原始备份，新版本成功写入才完成转换；重复读取不再次清零，失败不覆盖来源数据。爸爸空间可下载转换前原始备份。
- 已有成就阈值作为基线，不追溯补发成就币或称号，之后新跨过阈值才解锁。保留已有跨天证据，但不把缺少证据的掌握标记伪装成独立掌握。

完整备份封装为 `mizhupig-backup` v2，包含 state 和 wall；JSON 文本上限为 10000000 字符，不是按字节的 10 MB。恢复先记录原主状态和墙，再依次替换，成功后把恢复键写成字符串 `null`。异常尝试回滚；回滚失败保留恢复记录并告知可能混合状态，应停止学习购买。下次 loadState 会尝试恢复记录，仍不构成跨键事务或多标签隔离。

导入校验版本、设置范围、字库 ID、日期、唯一记录和任务结构。设置允许 dailyGoal 整数 1–30、newLimit 整数 0–20、weeklyGoal 整数 1–7，sound/music 为布尔值，合法范围比 UI 选项更宽。资产需为非负安全整数，晋级门需连续、去重、范围 1–5 且 XP 达到门槛；奖励校验键唯一、按来源金额与每日/同字次数限额，但不从账本重算全部余额，也不从日志重证掌握。

v2 可兼容含 `learned-10`、`learned-30`、`promotion-1` 至 `promotion-6` 的记录：这些不是当前成就项，读取时清理对应成就和佩戴引用，既有币/XP 不回收、账本保留。这是支持格式的归一化行为。

App 完整备份通过共享墙草稿控制器包含当前有效内存草稿；草稿冲突或无效时拒绝导出并提示，不静默遗漏。保存失败也可使用墙自己的下载按钮。墙的“载入最新 / 重试”实际重新加载存储布局，有草稿时确认放弃，不是重试保存草稿。墙布局在同一个 `mizhupig.wall.v1` 键内使用 collection v2 形状 `{version:2, revision, walls:[{id,items}]}`；旧 wall v1 `{version:1, revision, items}` 读取为第 1 面墙，保留 revision，并按 `unlockedWallCount` 补齐空墙。墙布局导入上限 1 MiB，只替换布局、不获得卡，导入 revision 不直接用于保存。collection v2 的墙 ID 必须从 0 连续到 `unlockedWallCount - 1`；布局约束为 x/y 0–1、width 0.08–0.8、rotation 绝对值不超过 180、z 整数 0–10000。卡号必须存在于已购卡与当前目录，并在单面墙内唯一；不同墙之间允许复用同一张已购卡。完整备份、恢复日志和回滚均兼容 wall v1 与 collection v2，并保留各自 revision 冲突保护。

初始读取失败会显示错误并以空状态渲染，不代表读到了用户进度；已有坏状态后续保存仍因校验拒绝。App 下载入口捕获导出异常并显示错误；异常墙、冲突草稿或未完成恢复记录仍可能拒绝导出，不能承诺所有错误均可一键导出。备份是用户控制的数据，不用于防作弊；清理浏览器、隐私模式结束、换设备不会自动恢复，应定期导出。

## 5. 奖励卡片资产工具

`src/data/cards.json` 与 `public/cards/manifest.json` 是内容一致、按数字 ID 排序的数组，例如 `[{"id":0,"file":"c0.jpg"}]`；`src/data/cards.ts` 提供应用侧目录。清单不保存源路径或私人元数据。

```sh
npm run cards:import -- /absolute/temp --dry-run
npm run cards:import -- /absolute/temp
npm run cards:sync
```

### 导入与同步

`scripts/import-cards.mjs` 只读取绝对源目录第一层普通文件，忽略子目录、符号链接及不支持扩展名。支持 jpg、jpeg、png、webp、avif、tif、tiff，扩展名不区分大小写。按确定字典顺序为图片分配当前最小空缺非负 ID，输出 `cN.jpg`；不覆盖现有卡、不删除源文件。不要以现有卡目录作为源，否则会重复导入。

Sharp 自动修正 EXIF 方向、透明区域合成白色，保持比例限制最长边 1600 像素且不放大小图，以质量 82 输出 JPEG，移除原始元数据。所有图片先在临时目录成功转换才发布；任何无效支持格式使全批失败。发布失败回滚本批新文件与清单，不删除原有图片。

`--dry-run` 实际解码转换以报告准确体积，但不写目标或清单。报告输入/输出字节和节省比例，比例可能为负。`--sync` 不接受源目录、不导入、不删除资产，扫描磁盘现有 `cN` 图片重建清单。重复数字 ID，如 `c1.jpg` 与 `c01.png` 同时存在，会报错。

不可并发导入或在导入期间手动编辑目标。多清单发布不具有数据库事务或强制终止保证，异常终止后可用 `--sync` 重建清单。

### 卡片展示与卡身份

卡片列表使用原图，`img` 标签带 `loading="lazy"`（视口外不加载）与 `decoding="async"`。未购买卡片由 CSS `filter: blur()` 加轻微放大遮蔽，无需生成或部署任何独立模糊资源。这不构成资产访问保护。

收藏只保存数字 ID。加载/恢复只清理当前目录不存在的 ID；删除后复用同号而旧收藏未经历该 ID 缺席时，旧收藏可能显示新图，工程不提供身份迁移保证。已部署页面不会自动获得本地新增资源。

## 6. 本地笔顺数据工具

```sh
npm run hanzi:import
npm run hanzi:import -- --reference /path/to/汉字学习资源
```

`scripts/import-hanzi.mjs` 默认读取项目同级 `汉字学习资源` 下的 `data/makemeahanzi/graphics.txt`、`dictionary.txt` 与 `data/字库-融合拼音笔画部首.json`。工具不联网、不运行参考脚本、不修改 source/practice/catalog。逐行流式筛选，只输出来源字库 1290 字加“牌”“魔”。融合参考仅用于部首兜底及笔画数/部首冲突审计，不复制拼音、词句、CEDICT 内容。

### 输出契约

`public/hanzi/<lowercase-codepoint>.json`，例如 `6c49.json`，字段为：

- `schemaVersion: 1`、`character`；
- `strokes: string[]`：SVG 笔画轮廓路径；
- `medians: number[][][]`：逐笔画中线点；
- `strokeCount`、`radical`、`structure`、`decomposition`、`source`。

笔画数取真实路径长度。SVG 坐标系是 1024 单位，展示需要翻转 Y 轴。部首优先 Make Me a Hanzi，其次参考，仍缺失为字符串空值。IDS 只推导完整明确的组合结构；半角/全角问号、缺失或裸部件为“未知”，不猜测独体结构。

`public/hanzi/manifest.json` 含 `characterCount`、`characters` 和以汉字索引的 `entries`，其中 `file` 为相对目录文件名。应用读取由 `src/data/hanzi.ts` 管理，只接受单个 Han 字，按 BASE_URL 请求单字文件，超时 10 秒。请求或校验失败返回 null，失败 Promise 会从缓存移除，允许组件明确重试；并发请求及成功数据仍复用缓存。UI 换字/卸载防止过期响应覆盖；降级保留汉字、拼音和词句。播放器使用 SVG 轮廓与中线路径裁切，自动演示由 strokeGate 纯时钟驱动，完整展示后等待 3 秒循环，自动速度按笔画数设置。跟写点单条最多 10000 个，仅组件内存；strokeMatching 核对当前笔的起终点、方向、距离及路径形状，不是书法评分。TracingStatus 绑定 taskId/character，每笔成功才推进 acceptedStrokes；全部完成才允许教学继续，重写、换字及重入会话重置。跟写完成不直接发奖励或建立独立掌握证据；卸载、隐藏页面和减少动态设置停止相关动画。导入校验弱于运行时路径/坐标验证，导入成功不能替代前端数据契约核对。

`reports/hanzi-import.json` 记录缺失、笔画数与部首冲突、参考空部首填补、未知结构原因、精选样本及输入与 source/practice/catalog 前后 SHA-256。

所有输出先在同文件系统 staging 完整生成，再替换旧目录和报告；异常回滚旧批次。目录交换是多次 rename，不是数据库事务，强制终止或断电没有原子保证。不要并发运行两个导入，也不要把正在交换的目录作为在线实时服务。

## 资源来源与公开发布要求

来源原表、卡片、音频及应用图标来自授权参考项目资源：`data-full-all.json` 对应 `src/data/source.json`，卡片原始组 `c0.jpg` 至 `c53.jpg`、六个 MP3、`app.png` 和 `favicon.ico`。卡片目录可由工具扩展。应用猪头、币、段位为原创 SVG，lucide-react 提供界面图标；不复制参考项目代码、界面或背景。

笔顺轮廓、中线、部首与 IDS 来自本地 Make Me a Hanzi 快照，graphics 衍生自 Arphic 字体，不是应用原创艺术，也不能自行重新授权。参考部首元数据注明源于 Unicode Unihan 15.1.0。

**公开发布前必须补齐并核验确切快照适用的 Make Me a Hanzi、Arphic 和 Unicode 许可、完整文本、署名及再分发义务。** 当前本地资源未包含完整 MMAH/Arphic 许可文本，泛称“LGPL/Arphic”不足以确定权利或商业再分发条件。详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。该说明不是许可文本，也不表示商业使用已获许可。

首次进入笔顺页（换字、换任务或数据重载均重新锁定），必须实际从头播放到最后一笔才挂载整个跟写区域；此前上一笔／下一笔禁用，仅显示居中示范与提示。DemoClock 跨暂停、前后台切换与调速保留位置及末尾等待时间，后台不计时，单帧最多计入 100ms。重播从头开始且不能绕过门控；解锁后重播／重新跟写不重新隐藏画布，示范结束不等于跟写完成，不发奖励。系统减少动态偏好默认不播放，点击“播放一遍笔顺，开始跟写”后播放一次并停止。三分钟跳过、有效前台练习计时及实际跟写判定维持原规则。

## 7. 离线、更新与声音

生产环境注册 Service Worker，开发服务器不注册。首次使用需要联网；HTTPS 或 localhost 才能使用 Service Worker，安装能力依浏览器而异。

worker 缓存名由注册 scope 和全部构建产物内容 SHA-256 组成（源码占位版本 v9，构建时替换）；同名卡片、音频或笔顺内容变更也触发新 worker，按 Service Worker scope 相对路径预缓存入口、构建资源、图标、webmanifest、卡片清单、清晰卡片、音频及 `hanzi/manifest.json`；不枚举预缓存全部单字 JSON。同源 GET 使用 cache-first，成功网络响应按需加入缓存，所以已访问单字可能离线可用，未访问单字不能保证。

App 的离线提示实际只检查卡清单和当前全部清晰卡片，不检查入口、脚本、样式、声音或全部笔顺，不能当作所有资源离线就绪的证明，更不能当作资源许可核验。缓存可能被回收，不承诺永久离线。新 worker 使用默认等待生命周期，没有 skipWaiting，不在学习途中强制接管；activate 仅删除同一 scope 前缀的旧缓存；fetch 仅查当前版本缓存并限定应用子路径。旧版未按 scope 命名的缓存保留，不参与 worker 查找，避免影响同源其他安装。

应用资产路径统一基于 Vite `base`（`src/data/cards.ts` 的 `assetUrl`/`cardUrl`、`hanziUrl`、SW 注册），Service Worker 内部以 `self.registration.scope` 解析相对路径。当前 base 为 `/piggymicharacter3/`，面向 GitHub Pages 子路径部署；改回站点根部署时移除 `base` 配置即可，代码不需要改动。

`vite.config.ts` 的 build 插件读取卡片清单 SHA-256 并附加到 `dist/sw.js`，使卡目录变化反映到 worker 文件。更新资产后需要重新构建部署。

`speechSynthesis` 仅在明确用户操作后启用；保存成功后，实际渲染的会话/考试题目按任务身份朗读一次，刷新恢复不能绕过激活。选字/选词题使用与屏幕一致的安全题干与空格停顿；拼音题只读固定无答案操作说明，不读取目标字或词境。SpeechQueue 保留取消句柄，通过 owner、generation 和片段身份可观察真实播放状态，迟到的取消/结束事件不能覆盖新播放。共享轻量 SpeakerButton 只在自身内容播放时动画，完成、取消、失败或卸载后静止，支持重听与减少动态效果。学习自动序列与单条字/词/句按钮使用相同片段身份。HelpPopover 的关闭回调通过 ref 更新，不因内联回调重新安装生命周期或误取消朗读；保留 Escape、外部点击及焦点归还。失败不阻塞学习，暂停或离开停止播放；音效、背景音乐和朗读激活仍独立。自动化测试不能证明真实设备发声，也不能保证设备离线中文语音。

## 8. 测试命令与覆盖

```sh
npm test
npm run test:cards
npm run test:hanzi
npm run build
```

| 测试文件 | 主要覆盖 |
| --- | --- |
| `tests/domain.test.ts` | 题目、会话、跨天/午夜/回拨、纠错、奖励与恢复 |
| `tests/growth.test.ts` | 段位、奖励限额、考试、成就与相关成长规则 |
| `tests/cards.test.ts` | 卡目录与收藏相关契约 |
| `tests/avatar.test.ts` | 头像裁剪及数据校验 |
| `tests/hanzi.test.ts` | 笔顺数据与展示用契约 |
| `tests/parentGate.test.ts` | 数学确认题 |
| `tests/taskProgress.test.tsx` | 数字环语义/边界、实际题数、考试暂停/身份及同步提交防重/失败重试 |
| `tests/audio.test.ts` | 语音取消句柄、owner/generation 快照、过期事件、播放片段与失败重试 |
| `tests/speakerButton.test.tsx` | 小喇叭 owner/片段隔离、停止/失败静态、手动重听 |
| `tests/helpPopover.test.tsx` | 内联关闭回调重渲染、Escape/外部点击、焦点与卸载清理 |
| `tests/appNarration.test.tsx` / `tests/renderedNarration.test.ts` | 无答案拼音说明、实际题干选择、共享渲染生命周期的一次播放/刷新静默/过期请求/保存失败/考试暂停恢复 |
| `tests/appPinyinFeedback.test.tsx` | 实际 App handler/effect 与真实 domain/storage 集成：正确 1000ms 快照交接、错误手动继续、提示补学/账本保持、重复提交、保存失败输入保留与重试、暂停/导航取消及最后一题完成；无 DOM hook harness 不替代浏览器验证 |
| `tests/pinyin.test.ts` | 拼音格式、完整目录读音、词境覆盖、direct 双题、旧任务备份兼容、赠币边界/持久化/冲突 |
| `scripts/import-cards.node-test.mjs` | 空缺 ID、格式、方向、尺寸、透明度、无效输入、回滚、预演、同步 |
| `tests/hanzi-import.node-test.mjs` | 笔顺导入与输出/失败处理 |

`npm test` 是 Vitest；`test:cards` 与 `test:hanzi` 分别运行 Node 测试文件。卡片导入测试使用独立临时目录，不触碰现有卡。构建检查不等于浏览器实际运行验证；人工语义、设备声音、浏览器安装与真实缓存行为有各自验证边界。

## 当前短笔与完整备份约定

短笔判定捕获起笔时 CSS 画板尺度与 pointerType，鼠标目标14px、触控目标20px，转换为画板单位并受笔长 40%/56 单位上限约束，屏幕笔长 80–140px 平滑退出补偿。直短笔以整体正向与有效净位移拒绝点击、反向、半笔，长笔和折钩保留有序路径及首尾转弯校验。完成练习需要全部笔画通过，错误仅重试当前笔；180秒前台出口或资料故障可跳过，不伪造完成。

音量图标控制音乐与音效，不关闭朗读；页头操作紧凑，进度标题的帮助与退出并保存属于同一容器。课堂仅一个“字 · 笔画小课堂”标题及所属帮助。墙的移动/尺寸/旋转/层级操作为具可访问名称的 44px 图标，保留方向键移动。

墙无独立文件下载或导入：统一在爸爸空间导出/恢复完整备份。App 的 useWallDraft 保留有效快照、dirty/blocked/loaded，切页不会销毁故障草稿；有效内存草稿优先导出，读取损坏且无草稿时报告错误，不假造空墙。草稿仅当前会话，刷新或关闭仍可能丢失。载入最新与完整恢复覆盖草稿需确认，取消或失败保留草稿；完整恢复沿用跨 key 事务/回滚，检查主状态与墙 revision，成功同步共享快照，旧墙文件不作为完整备份。

## 当前界面细节

拼音试题保存成功后保持同一题目、答案展示和键盘挂载，键盘与提示/暂时想不起来按钮禁用；展示提交时的题目、拼音与声调快照。正确仅给行内勾选与简短鼓励，2000ms 后沿用下一任务跳转；错误仅温柔提示正确读音，由“继续练习”手动前进，不展示大型教学或词句面板。提交只保存一次；提示题领域语义不变，暂停、导航和卸载取消等待；试题无朗读门控，介绍页与跟写门控不变。

准备认领按 `wordId` 保留首次出现顺序去重，计数、全选及单字切换使用同一集合；双题任务不重复显示汉字。拼音首题保留真实输入、IME 与 `buildPinyinAnswer` 校验，输入居中于目标字上方且无框；五个声调按钮使用 `aria-pressed`，轻声不预选。成功提示改为固定底部六秒自动消失的轻提示，经验仅显示 `XpIcon` 与数值；错误仍为持久 `role="alert"`。跟写庆祝由 `completePractice` 保存成功后的任务键驱动，只装饰对应练习框，尊重减少动态效果偏好，不因重写或刷新重复奖励。

卡片缩略图统一居中 3:4 `object-fit: cover` 与单层精简边框/阴影，横图无留白；详情仍完整显示原图。待兑换选中态提供短暂动画与高亮，兑换保存成功后才揭示；确认交易保留，仅去掉编号揭晓问句。段位依次为青铜、白银、黄金、钻石、星曜、咪猪头，星位 `[3,3,4,4,5,5]`、各档 XP 步长及累计门槛均不变，保存数据无需迁移。

## 沉浸会话与数据扩展

`dailyPlans`按日期保存新字/复习字预约，旧v2缺失字段兼容，不补发历史奖励。Session可选`preparation`持久化认领和确认；`practice[taskId]`保存teaching/ready、activeMs、completed/skipped以及timeout/load-error原因。domain纯helper控制确认、限增时间、完成、跳过和进入试题门槛，storage严格验证任务链接与账本、配额及完整备份。

trace来源同字同日幂等2XP/0币，practice通过taskId关联奖励拆分为3XP/1币，不扣既有认领奖励，关联提示题不叠加努力经验。保存成功才展示庆祝。计时在CharacterLearning已加载、前台、未暂停时以受限心跳累计并持久化，完整练习恢复不重新发回调。

语音独立手势激活，generation-scoped playback handles支持替换及陈旧清理，页面隐藏终止语音；音乐场景不取消新语音。App统一考试和学习沉浸场景，GrowthPage只提供考试入口，ExamPanel负责保存暂停后退出。离线缓存升级v8。

非拼音题的无提示独立正确答案在 commit 保存成功后立即前进；拼音题保存成功后保留提交题干、原始拼音输入与所选声调快照，正确答案展示绿色勾选反馈，约 1000ms 后进入已保存的目的题（最后一题进入完成页），不提供重复提交或手动继续按钮。错误拼音保留反馈并等待明确点击“继续练习”；提示／辅助答对同样短暂反馈，但不改变 domain 的学习证据、补学和奖励规则。计时器校验会话与目的题身份，暂停、导航、卸载或替换反馈取消等待；保存失败不开始等待，保留输入和声调以便重试。首题仍不独立结算整字。准备、教学和结果页保留原流程。ExamPanel 复用 TaskProgressRing（cursor/questions.length），同步提交 gate 在调用 onCommit 前锁住 exam.id/cursor，保存失败释放以便重试；回调对比最新已渲染题身份并核对选项，题组按身份重建，阻止双击 detail>1、重复 Enter/Space 与 IME 组合激活。服务端渲染与纯 gate 测试不等于真实浏览器输入事件验证。

## 入场朗读、奖励交接与最终掌握（当前规则）

- 移除帮助问号与解释弹层。所有目标汉字高亮水平居中。教学顺序为汉字三遍、实际字库例词一遍、例句一遍；裸字不充当例词。
- 每个遮罩按题型朗读：停顿 500ms、哪个字／哪个词、停顿 500ms；不访问遮罩答案。拼音题仍只朗读无答案的填写说明。
- 首次入场朗读不可被重播、答案或普通播放控制打断；退出／暂停可以取消。刷新与取消后保留待兑现奖励，完整重试后才兑现一次；设备失败时允许重试或明确确认自行阅读，不将计时或故障冒充播放完成。
- 答案与学习证据立即保存；经验、猪头币及提示须等待完整目的题首次朗读结束。奖励账本 pending 元数据持久保存来源、会话、目的题与朗读标识，预占每日额度，幂等兑现。没有下一题的有效完成即时兑现。跟写奖励同样等待首次教学朗读。
- 已完成跟写可以本地再次练习，不清除存档完成、不重新计时、不重复奖励。
- 1、3、7、14、30 天复习后，30 天间隔到期的独立双题复习通过才完全掌握；旧版阶段 4 不自动升级。完全掌握不再自动排期，仍可自愿练习；提示、错误与不完整双题不是最终通过证据。
