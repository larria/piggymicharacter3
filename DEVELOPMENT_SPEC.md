# 咪猪头识字成长册 · 开发规格

本文描述当前工程实现与运行要求。用户流程和奖励数值的完整说明见[产品规格](./PRODUCT_SPEC.md)，本文不重复产品规则全文。

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

非精选字即使存在词句或笔顺也只能进入辅助练习。结构测试可以验证不同字、目标词、选项唯一和遮罩，不替代人工语义审查。加入独立题需要人工确认句意和替换后答案唯一合理，不能只靠通过自动测试。

### 学习与成长实现约束

使用本地日历及可注入日期，而不是简单按 24 小时滚动打卡。学习、考试互斥；持久化任务、试卷、选项、正确答案和题库版本，恢复不能重新抽卷。奖励唯一键防止重复提交和重复结算；XP 与消费币分离，成就币与每日答题奖励分别记账。各段星数、奖励额度、晋级分数见产品规格，以 domain 模块为实际实现依据。掌握计数直接判断 `stage >= 3 && lastAdvanced !== null`，初识判断有效进阶日期，考试资格再要求题库覆盖；不回溯日志证明次数。有效学习日筛选答对、无提示、非 correction，assessment 还需 advanced；普通 review（含小测）不要求进阶。成就连续指标取历史最长，而 stats 取当前连续。rarity 是配置枚举 common/uncommon/rare/epic/legendary，不按币值或达成率推算。

普通队列按当日全部日志排除已学字，与成就有效日志口径不同。无限练习从已核实字随机取最多 10 字；选字会话去重后要求 1–10 个有效 ID，每字双题。二者不通过普通每日队列配额筛选，但仍受奖励与进阶规则限制。小测十题、晋级三十题分别取不同字，字符/词题各半，试卷不更新 progress。

头像异步裁剪读取最新状态并防止关闭/换卡后提交过期结果；Canvas 生成白底 256×256 JPEG，最大 256 KiB，依次尝试 .9/.8/.65/.5 质量。校验 Data URL/Base64、JPEG 首尾和 SOF 尺寸，但不验证图片确实来自声明卡片。保存失败保留原头像，成功才关闭编辑器；来源卡号不在目录时归一为 null。

## 4. 本地存储与备份

应用通过 localStorage 保存 v2 主状态，包括学习进度、任务、设置、日志、XP、猪头币奖励账本、成就、考试、收藏、头像与 `unlockedWallCount`（缺失时兼容归一为 1，范围 1–10）；收藏墙使用独立存储键和修订号。解锁成本固定为 `[20,30,50,80,120,170,230,300,400]`。备份包含全部墙，不能只复制主状态当作完整用户备份。

当前存储键为 `mizhupig.growth.v2`（主状态）、`mizhupig.wall.v1`（收藏布局；键名保持不变，载荷为 collection v2）、`mizhupig.expedition.v1`（兼容来源）、`mizhupig.pre-v2-backup`（原始备份）、`mizhupig.restore-transaction.v1`（恢复记录）。读取旧 wall v1 `{version:1,revision,items}` 时保留 revision 和第一面布局并扩展为空的新墙；写回为 collection v2 `{version:2,revision,walls}`。

写入先比较 revision，成功后加一；检查与写入不是原子 compare-and-swap，仍可能有同时提交竞争。App 仅监听主状态键：停止播放、退出学习并提示刷新，不自动加载新状态或锁死全部按钮，也不处理 key 为 null 的 clear 通知。墙监听墙键和 clear 通知，阻止保存并提示下载草稿、载入最新；不监听主状态键。因此跨标签更新不是实时合并或完整并发隔离。提交、购买与结算具有幂等标识。浏览器禁止存储、容量不足、异常数据或修订冲突必须显示错误，不静默覆盖。墙拖动使用节流草稿保存，结束立即保存；写入失败保留可导出的内存布局，不报告为已保存。localStorage 和多个键之间不构成数据库事务，实际使用应避免多标签同时操作。

### 当前支持的备份格式

- **v2**：校验后恢复完整支持状态；恢复替换当前数据前需要确认。
- **v1**：需要明确确认“保留学习、重置奖励”。保留学习进度、设置与日志；奖励、旧贝壳/币、已购卡、称号、考试、墙重置。未完任务保留在原始备份中，根据学习进度重新安排。
- 本地可从 `mizhupig.expedition.v1` 读取兼容来源。处理前保存原始备份，新版本成功写入才完成转换；重复读取不再次清零，失败不覆盖来源数据。爸爸空间可下载转换前原始备份。
- 已有成就阈值作为基线，不追溯补发成就币或称号，之后新跨过阈值才解锁。保留已有跨天证据，但不把缺少证据的掌握标记伪装成独立掌握。

完整备份封装为 `mizhupig-backup` v2，包含 state 和 wall；JSON 文本上限为 10000000 字符，不是按字节的 10 MB。恢复先记录原主状态和墙，再依次替换，成功后把恢复键写成字符串 `null`。异常尝试回滚；回滚失败保留恢复记录并告知可能混合状态，应停止学习购买。下次 loadState 会尝试恢复记录，仍不构成跨键事务或多标签隔离。

导入校验版本、设置范围、字库 ID、日期、唯一记录和任务结构。设置允许 dailyGoal 整数 1–30、newLimit 整数 0–10、weeklyGoal 整数 1–7，sound/music 为布尔值，合法范围比 UI 选项更宽。资产需为非负安全整数，晋级门需连续、去重、范围 1–5 且 XP 达到门槛；奖励校验键唯一、按来源金额与每日/同字次数限额，但不从账本重算全部余额，也不从日志重证掌握。

v2 可兼容含 `learned-10`、`learned-30`、`promotion-1` 至 `promotion-6` 的记录：这些不是当前成就项，读取时清理对应成就和佩戴引用，既有币/XP 不回收、账本保留。这是支持格式的归一化行为。

App 完整备份读取已存墙，不含墙组件未保存 draft；保存失败后应使用墙自己的下载按钮。墙的“载入最新 / 重试”实际重新加载存储布局，有草稿时确认放弃，不是重试保存草稿。墙布局在同一个 `mizhupig.wall.v1` 键内使用 collection v2 形状 `{version:2, revision, walls:[{id,items}]}`；旧 wall v1 `{version:1, revision, items}` 读取为第 1 面墙，保留 revision，并按 `unlockedWallCount` 补齐空墙。墙布局导入上限 1 MiB，只替换布局、不获得卡，导入 revision 不直接用于保存。collection v2 的墙 ID 必须从 0 连续到 `unlockedWallCount - 1`；布局约束为 x/y 0–1、width 0.08–0.8、rotation 绝对值不超过 180、z 整数 0–10000。卡号必须存在于已购卡与当前目录，并在单面墙内唯一；不同墙之间允许复用同一张已购卡。完整备份、恢复日志和回滚均兼容 wall v1 与 collection v2，并保留各自 revision 冲突保护。

初始读取失败会显示错误并以空状态渲染，不代表读到了用户进度；已有坏状态后续保存仍因校验拒绝。导出函数没有完整异常捕获，异常墙或未完成恢复记录可能使导出抛错，不能承诺所有错误均可一键导出。备份是用户控制的数据，不用于防作弊；清理浏览器、隐私模式结束、换设备不会自动恢复，应定期导出。

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

`public/hanzi/manifest.json` 含 `characterCount`、`characters` 和以汉字索引的 `entries`，其中 `file` 为相对目录文件名。应用读取由 `src/data/hanzi.ts` 管理，只接受单个 Han 字，按 BASE_URL 请求单字文件，超时 10 秒。请求或校验失败返回 null，Promise 缓存也保留失败结果，因此同一页面生命周期再次打开不会自动重试。UI 换字/卸载防止过期响应覆盖；降级保留汉字、拼音和词句。播放器使用 SVG 轮廓与中线路径裁切，跟写点单条最多 10000 个，仅组件内存，无评分或保存；卸载和减少动态设置停止动画。导入校验弱于运行时路径/坐标验证，导入成功不能替代前端数据契约核对。

`reports/hanzi-import.json` 记录缺失、笔画数与部首冲突、参考空部首填补、未知结构原因、精选样本及输入与 source/practice/catalog 前后 SHA-256。

所有输出先在同文件系统 staging 完整生成，再替换旧目录和报告；异常回滚旧批次。目录交换是多次 rename，不是数据库事务，强制终止或断电没有原子保证。不要并发运行两个导入，也不要把正在交换的目录作为在线实时服务。

## 资源来源与公开发布要求

来源原表、卡片、音频及应用图标来自授权参考项目资源：`data-full-all.json` 对应 `src/data/source.json`，卡片原始组 `c0.jpg` 至 `c53.jpg`、六个 MP3、`app.png` 和 `favicon.ico`。卡片目录可由工具扩展。应用猪头、币、段位为原创 SVG，lucide-react 提供界面图标；不复制参考项目代码、界面或背景。

笔顺轮廓、中线、部首与 IDS 来自本地 Make Me a Hanzi 快照，graphics 衍生自 Arphic 字体，不是应用原创艺术，也不能自行重新授权。参考部首元数据注明源于 Unicode Unihan 15.1.0。

**公开发布前必须补齐并核验确切快照适用的 Make Me a Hanzi、Arphic 和 Unicode 许可、完整文本、署名及再分发义务。** 当前本地资源未包含完整 MMAH/Arphic 许可文本，泛称“LGPL/Arphic”不足以确定权利或商业再分发条件。详见 [THIRD_PARTY_NOTICES.md](./THIRD_PARTY_NOTICES.md)。该说明不是许可文本，也不表示商业使用已获许可。

## 7. 离线、更新与声音

生产环境注册 Service Worker，开发服务器不注册。首次使用需要联网；HTTPS 或 localhost 才能使用 Service Worker，安装能力依浏览器而异。

worker 当前缓存名为 `piggy-learning-v6`，按 Service Worker scope 相对路径预缓存入口、构建资源、图标、webmanifest、卡片清单、清晰卡片、音频及 `hanzi/manifest.json`；不枚举预缓存全部单字 JSON。同源 GET 使用 cache-first，成功网络响应按需加入缓存，所以已访问单字可能离线可用，未访问单字不能保证。

App 的离线提示实际只检查卡清单和当前全部清晰卡片，不检查入口、脚本、样式、声音或全部笔顺，不能当作所有资源离线就绪的证明，更不能当作资源许可核验。缓存可能被回收，不承诺永久离线。新 worker 使用默认等待生命周期，没有 skipWaiting，不在学习途中强制接管；activate 会删除名称不等于当前 CACHE 的缓存，不只限定旧 piggy 缓存。

应用资产路径统一基于 Vite `base`（`src/data/cards.ts` 的 `assetUrl`/`cardUrl`、`hanziUrl`、SW 注册），Service Worker 内部以 `self.registration.scope` 解析相对路径。当前 base 为 `/piggymicharacter3/`，面向 GitHub Pages 子路径部署；改回站点根部署时移除 `base` 配置即可，代码不需要改动。

`vite.config.ts` 的 build 插件读取卡片清单 SHA-256 并附加到 `dist/sw.js`，使卡目录变化反映到 worker 文件。更新资产后需要重新构建部署。

`speechSynthesis` 由点击触发，失败给出提示而不阻塞学习；音效及背景音乐也只由用户操作启动。暂停或离开页面停止播放。自动化测试不能证明真实设备发声，也不能保证设备离线中文语音。

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
| `scripts/import-cards.node-test.mjs` | 空缺 ID、格式、方向、尺寸、透明度、无效输入、回滚、预演、同步 |
| `tests/hanzi-import.node-test.mjs` | 笔顺导入与输出/失败处理 |

`npm test` 是 Vitest；`test:cards` 与 `test:hanzi` 分别运行 Node 测试文件。卡片导入测试使用独立临时目录，不触碰现有卡。构建检查不等于浏览器实际运行验证；人工语义、设备声音、浏览器安装与真实缓存行为有各自验证边界。
