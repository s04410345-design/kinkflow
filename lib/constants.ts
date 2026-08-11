import type { GraphNode, GraphLink, AppData, QuizScenarioQuestion, QuizSwipeQuestion } from './types';

// ================= 知識網絡圖預設節點 =================
export const graphNodes: Omit<GraphNode, 'x' | 'y' | 'vx' | 'vy' | 'fx' | 'fy' | 'index'>[] = [
  {
    "id": "bdsm",
    "level": 0,
    "radius": 50,
    "color": "#E8C5C8",
    "label": "BDSM大廳",
    "desc": "探索權力交換、感官刺激與深層信任的起點。",
    "crossLinks": [],
    "image": "/images/nodes/realistic_bondage_main.png",
    "kamonIcon": "/images/nodes/kamon_bondage_main.png",
    "intro": "BDSM 是一個總稱，涵蓋了束縛與紀律 (Bondage & Discipline)、支配與臣服 (Dominance & Submission)、施虐與受虐 (Sadism & Masochism)。它是一種建立在高度信任基礎上，且必須遵循安全、理智、知情同意 (SSC) 或風險認知同意 (RACK) 原則的權力交換與感官探索活動。",
    "practice": "在 BDSM 的實踐中，參與者會刻意製造權力不對等，或是透過物理限制、角色扮演、感官刺激來達到心理與生理的極致滿足。事前溝通、界線設定與安全詞的建立是每一次實踐不可或缺的步驟。",
    "hazard": "缺乏經驗或溝通不良可能導致參與者心理創傷 (如跨越邊界造成的 PTSD)。而在物理層面，不當的器械使用、施力過度，都可能引發從挫傷到神經損傷等不同程度的身體傷害。",
    "first_aid": "任何實踐都應備妥專用安全剪刀與急救箱。若發生意外或聽到安全詞，必須立刻停止一切動作並解除束縛。若參與者出現心理崩潰，應立刻給予保暖與陪伴，必要時尋求專業心理諮商協助。",
    "detail_text": "### BDSM 的心理學與哲學深度\n\nBDSM 遠遠超越了單純的性愛範疇；對許多實踐者而言，這是一場關於信任、臣服與自我救贖的深度心理探索。\n\n**信任的終極考驗**：當 Sub 將自己的身體與心理防線完全交給 Dom 時，這種絕對的脆弱與被接納，能帶來難以言喻的親密感。Dom 在掌握這份權力時，不僅承擔了帶領的責任，更肩負著守護對方安全的重擔。\n\n**釋放控制權的自由**：在現代社會中，人們往往需要承擔巨大的決策壓力。BDSM 創造了一個「魔法圈 (Magic Circle)」，在這個結界內，Sub 可以完全放下現實社會的責任與道德包袱，退化到最純粹的狀態；而 Dom 則可以釋放內在的掌控慾，兩者在這種動態中獲得了某種反向的心理平衡。\n\n**痛覺與腦內啡的轉化**：在 SM 的實踐中，痛覺只是一種媒介。當痛覺經過精密的控制，大腦會分泌大量的腦內啡與催產素，將原本的痛苦轉化為近乎宗教般的狂喜 (Ecstasy)。這是一種對生命感知的極致放大，也是許多實踐者終其一生追求的 Subspace 境界。"
  },
  {
    "id": "community_safety",
    "level": 1,
    "radius": 38,
    "color": "#E07A5F",
    "label": "社群與安全防護",
    "desc": "進入實踐前不可或缺的安全防護與倫理基石。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop",
    "intro": "社群與安全是整個 BDSM 文化能夠延續與發展的地基。沒有安全的環境與社群共識，任何實踐都可能淪為犯罪、剝削或未經同意的侵害。",
    "practice": "積極參與社群聚會 (Munch) 以結識同好、交流經驗。在網路上尋找伴侶時保持警惕，嚴格遵守 SSC (安全、理智、知情同意) 或 RACK (風險認知與同意) 等核心原則，並尊重對方的 Vanilla 現實隱私。",
    "hazard": "社群中可能隱藏著掠食者 (Predators)，利用新手的無知進行剝削與心理操控；網路交友也常伴隨著照片外流、隱私曝光等風險。",
    "first_aid": "遇到危險或感到不適時，請勇於向信任的社群前輩、主辦方或管理員求助。若涉及恐嚇或違法行為，應立刻截圖保存證據，必要時尋求法律與警方協助。",
    "detail_text": "### 建立健康社群的責任\n\n**SSC 與 RACK 的精神**：Safe, Sane, Consensual (安全、理智、知情同意) 是 BDSM 歷史悠久的黃金法則。而近年來推廣的 Risk-Aware Consensual Kink (RACK) 則更進一步承認了「絕對的安全」並不存在，強調參與者必須對「風險」有充分的認知並願意承擔。\n\n**防範社群掠食者**：一個健康的社群不僅僅是提供交流的平台，更應該具備自淨能力。資深玩家有責任引導新手建立正確的安全觀念，並對跨越界線、忽視知情同意的惡劣行為發聲譴責。\n\n**隱私與邊界**：在社群中，隱私是至關重要的。尊重他人的化名 (Vanilla/Kink 切割)、不隨意肉搜、不強迫他人曝光，這些都是維護這片文化綠洲所必需的素養。"
  },
  {
    "id": "bondage",
    "level": 1,
    "radius": 38,
    "color": "#3D405B",
    "label": "繩藝與肢體束縛",
    "desc": "日式繩縛 (Shibari)、幾何美學與肢體限制。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    "intro": "繩縛與拘束是 BDSM 中極具代表性的視覺與觸覺實踐。它透過麻繩、皮帶或金屬器具限制行動，將控制權有形化，並帶來深層的無力感與安心包覆感。",
    "practice": "從簡單的床頭手銬、絲帶綑綁，到充滿儀式感與幾何美學的日式繩縛 (Shibari/Kinbaku)，甚至挑戰重力與極限的幾何懸吊 (Suspension)。",
    "hazard": "綑綁極易引發神經壓迫 (尤其在手腕與腋下神經叢)、血液循環截斷導致肌肉壞死。懸吊更是伴隨著墜落、頸椎拉傷或窒息的致命風險。",
    "first_aid": "任何繩縛進行時，身旁必須備妥專用的 EMT 安全剪刀。若被縛者表示手腳發麻、失去知覺或末梢發紫，必須立刻剪斷繩索，絕對不能猶豫。若發生意外墜落，切勿隨意搬動傷者，應固定頸椎並立刻呼叫救護車。",
    "detail_text": "### 繩索中的禪意與連結\n\n**肌膚與繩索的對話**：日式繩縛 (Shibari) 是一門深奧的藝術。繩手 (Rigger) 透過麻繩在被縛者 (Bunny) 身上游走，每一道摩擦、每一次拉扯，都是一次觸覺的溝通。繩索成為了兩人神經的延伸，將雙方的情緒緊緊連結在一起。\n\n**無力感的極致釋放**：被完全拘束時，人會進入一種被迫放下的狀態。因為「無論做什麼都無法改變現狀」，大腦反而會停止焦慮。這種被強制剝奪行動能力的體驗，對於平時掌控慾強烈、生活壓力巨大的人來說，往往是一種極為強效的心理療癒。\n\n**重力與信任的交響曲**：在懸吊 (Suspension) 中，被縛者將自己所有的重量與生命安全完全交給繩手與繩索。當雙腳離地的那一刻，恐懼、痛楚與絕對的臣服交織在一起，能將人的意識推向難以名狀的宇宙邊際。"
  },
  {
    "id": "ds_main",
    "level": 1,
    "radius": 38,
    "color": "#81B29A",
    "label": "支配與臣服動態",
    "desc": "Dom & Sub 權力交接、稱呼儀式與契約長相。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "/images/nodes/realistic_ds_main.png",
    "kamonIcon": "/images/nodes/kamon_ds_main.png",
    "intro": "DS 代表 Dominance (支配) 與 Submission (臣服)。相較於注重身體感官的實踐，DS 更專注於純粹的心理動態與權力結構的長期經營與靈魂交接。",
    "practice": "主導方 (Dom) 掌握決策權並引導關係走向，被動方 (Sub) 則放下自我意志選擇服從。涉及專屬稱呼、日常規矩、所有權信物與長期生活契約 (TPE)。",
    "hazard": "DS 關係最大的風險在於權力的濫用。當 Dom 缺乏同理心或 Sub 喪失自我底線時，極易演變成情緒勒索、煤氣燈效應 (Gaslighting) 等有毒關係。",
    "first_aid": "維持健康的 DS 關係需要頻繁且誠實的跳脫角色溝通 (Check-in)。若感到持續焦慮、自尊低落或恐慌，應勇敢提出暫停或結束關係。",
    "detail_text": "### 權力交換的藝術與靈魂的赤裸\n\n**Dom 的責任與孤獨**：很多人誤以為當 Dom 只需要發號施令，事實上，優秀的 Dom 必須具備極高的情緒智商與敏銳度。Dom 是這段關係的掌舵手，必須承擔起 Sub 的情緒起伏、安全把關與成長引導。\n\n**Sub 的力量**：臣服並非懦弱，而是另一種形式的強大。Sub 是因為擁有絕對的自我選擇權，才「選擇」將自己交給另一個人。這種主動放棄權力的行為，是對 Dom 最高的讚美與信任。\n\n**靈魂的共振**：最深層的 DS 關係，往往超越了肉體的接觸。它是一種靈魂層面的互相滋養——Dom 在控制中感受到自身的價值與被需要，Sub 在服從中找到歸屬與平靜。"
  },
  {
    "id": "sm_main",
    "level": 1,
    "radius": 38,
    "color": "#F2CC8F",
    "label": "施虐與痛覺體驗",
    "desc": "鞭打、拍打、滴蠟與神經快感張力。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "/images/nodes/realistic_sm_main.png",
    "kamonIcon": "/images/nodes/kamon_sm_main.png",
    "intro": "SM 代表 Sadism (施虐) 與 Masochism (受虐)。這是一種將痛覺、羞辱或強烈感官刺激轉化為愉悅與快感的極致生理與心理實踐。",
    "practice": "實踐方式從輕度的拍打、掐咬，到中度的散鞭、皮鞭鞭撻、低溫滴蠟體驗。Sadist 透過給予刺激獲得掌控滿足，Masochist 則從承受痛楚中獲得情緒宣洩與高潮。",
    "hazard": "操作不當極易造成皮下出血壞死、嚴重燒燙傷、神經永久性損傷、甚至因為工具不潔引發破傷風與嚴重感染。",
    "first_aid": "避開脊椎、關節、腎臟與頸部等脆弱部位。隨身準備急救箱與冰袋，發生破皮流血時必須立刻暫停並進行消毒止血處理。",
    "detail_text": "### 痛覺的煉金術與神經的狂飆\n\n**痛覺與快感的一線之隔**：在神經生理學上，大腦處理強烈痛覺與極度快感的區域高度重疊。SM 實踐者（Masochist）並不是單純「喜歡痛」，而是享受大腦為了抵抗痛楚而分泌出大量腦內啡 (Endorphins) 與腎上腺素時，所帶來的迷幻與狂喜狀態。\n\n**Sadist 的慈悲**：真正的 Sadist (施虐者) 絕非暴力狂。相反地，他們是極具共情能力的藝術家。他們必須精準閱讀受方每一個細微的肌肉抽搐與呼吸變化，在痛苦的邊緣反覆試探，將對方推向極限，卻又在對方即將崩潰前給予安撫。\n\n**Subspace 與 Domspace**：當 SM 進行到一定深度，Masochist 會進入一種被稱為 Subspace 的狀態——意識變得模糊、時間感喪失、像是漂浮在雲端般的平靜；而 Sadist 則可能進入 Domspace——專注力極度集中、感受到如神祇般掌控一切的全能感。"
  },
  {
    "id": "sensory_deprivation",
    "level": 1,
    "radius": 38,
    "color": "#5C9EAD",
    "label": "感官剝奪與剝離",
    "desc": "眼罩蒙眼、耳罩白噪音與感覺剝奪體驗。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop",
    "intro": "剝奪感官是透過遮蔽視覺、聽覺或觸覺，強行阻斷個體與外界的資訊交流，藉此放大其他感官體驗並誘發未知恐懼與依賴感。",
    "practice": "使用皮革眼罩遮蔽視覺是最常見做法。進階實踐包括使用降噪耳機播放白噪音、戴上全覆蓋乳膠頭套、甚至將人放置在完全隔音的黑暗空間或感覺剝奪艙中。",
    "hazard": "視覺剝奪容易導致失去平衡跌倒受傷。密閉頭套若通風不良會造成窒息。長時間或極端的感覺剝奪極易引發恐慌發作 (Panic Attack) 或幽閉恐懼症。",
    "first_aid": "實踐者必須隨時在旁監控對方的呼吸節奏與情緒反應。一旦對方出現過度換氣或劇烈恐慌，應立刻移除所有遮蔽物，提供明亮光線與聲音引導深呼吸。",
    "detail_text": "### 在黑暗中被放大的宇宙\n\n**未知的恐懼與期待**：人類高度依賴視覺來建立安全感。當視覺被剝奪時，大腦無法預測下一步會發生什麼。此時，一根冰冷的羽毛滑過肌膚、一聲清脆的鞭響，都會因為「未知」而被放大數十倍。\n\n**時間與空間的消融**：在多重感官被剝奪 (如又盲又聾) 的狀態下，大腦會開始失去對時間流逝與空間方位的感知。意識會被迫向內收斂，這種狀態極易引發深度的恍惚 (Trance)，帶領參與者進入類似深層冥想的奇異維度。\n\n**絕對的孤立與依賴**：當你聽不到也看不見，全世界只剩下 Dom 觸碰你時的溫度，那種被絕對孤立卻又被緊緊抓著的依賴感，會讓 Sub 產生極其強烈的情感投射。"
  },
  {
    "id": "scenario_play",
    "level": 1,
    "radius": 38,
    "color": "#9B5DE5",
    "label": "情境劇本與扮演",
    "desc": "角色扮演 (Roleplay)、Pet Play 與年齡退行。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?q=80&w=1200&auto=format&fit=crop",
    "intro": "情境扮演將戲劇元素融入 BDSM，透過設定特定的場景、人設與劇本，讓參與者暫時抽離現實身分，滿足深層禁忌幻想。",
    "practice": "從經典的醫療扮演、校園扮演，到年齡扮演 (Age Play)、寵物扮演 (Pet Play/Puppy Play)、假寐性愛 (Somnophilia) 或 CNC (知情同意下的非自願扮演)。",
    "hazard": "沉浸過深可能導致現實感滲透 (Bleeding)，讓參與者在遊戲結束後仍無法脫離角色情緒。極端情境若無嚴格規範，極易造成真實心理創傷。",
    "first_aid": "設定與情境完全違和的「中斷詞」(如喊出「香蕉」)。發現伴侶出現創傷觸發反應 (Triggered)，立刻中斷劇情，進行 Grounding (接地) 練習，喚回其現實意識。",
    "detail_text": "### 戴上面具以展現真實\n\n**奧斯卡級別的心理釋放**：人類在現實中受到無數的道德與身分枷鎖限制。情境扮演提供了一個合法且安全的避風港，讓那些最黑暗、最禁忌的念頭得以付諸實行。\n\n**年齡與寵物扮演的純粹**：在 Age play (如退化成嬰兒) 或 Pet play (如扮成小狗) 中，Sub 可以名正言順地褪去成年人的複雜心智與語言能力。不用思考房貸、工作與人際關係，只要單純地吃飯、撒嬌、被摸頭就能獲得獎勵。這是一種極致的心理退行 (Regression)。\n\n**CNC 的終極矛盾**：Consensual Non-Consent (知情同意下的非自願) 是情境扮演中最高深的一門藝術。雙方在清醒時詳細規劃好劇本與底線，然後在遊戲中盡情演繹「反抗與強迫」。這滿足了被徹底征服與免除罪惡感的幻想。"
  },
  {
    "id": "mental_control",
    "level": 1,
    "radius": 38,
    "color": "#F15BB5",
    "label": "心理控制與催眠",
    "desc": "催眠引導、潛意識暗示與精神臣服藝術。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop",
    "intro": "心理控制與催眠是一種不動粗、不流血，卻能直達靈魂深處的高階 DS 實踐，旨在深度影響甚至重塑被動方的潛意識與思維模式。",
    "practice": "使用重複的語言誘導、催眠指令 (Hypnosis)、神經語言程式學 (NLP) 技巧，引導對方進入恍惚狀態 (Trance)，並植入特定的感官暗示或行為觸發機制 (Trigger)。",
    "hazard": "極度危險。不當的催眠可能意外喚醒未處理的童年創傷。而惡意的心理控制則會演變成邪教式洗腦、煤氣燈效應，徹底摧毀一個人的心智自主權。",
    "first_aid": "若在催眠過程中誘導出劇烈的負面情緒或恐慌，Dom 必須保持絕對冷靜，立刻給予清晰的解除指令，喚醒對方並提供溫暖的現實安撫。絕不可將未經同意的有害指令留在對方潛意識中。",
    "detail_text": "### 潛意識的黑客任務\n\n**心靈的完全裸露**：相比於肉體上的赤裸與束縛，將大腦的防禦機制完全解除、任人植入指令的「心靈裸露」，帶來的是更為深沉、令人戰慄的快感與臣服。\n\n**重構現實的魔法**：高超的心理控制甚至能改變感官體驗。例如，透過暗示讓冰塊感覺像燃燒的炭火，或是聽到某個特定字眼就瞬間全身酥軟高潮。這是一種將 Dom 的意志直接覆蓋在 Sub 神經網路上的魔法。\n\n**雙面刃的道德重量**：心理控制是一把極其鋒利的雙面刃。它可以被用來幫助 Sub 克服焦慮、戒除壞習慣，帶來深度的平靜；但若落入掠食者手中，則能兵不血刃地摧毀一個人的意志。"
  },
  {
    "id": "consensus_risk",
    "level": 1,
    "radius": 38,
    "color": "#00BBF9",
    "label": "知情同意與溝通",
    "desc": "紅黃綠安全詞、溝通儀式與事後撫慰 (Aftercare)。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1499209974431-9dac3cea0047?q=80&w=1200&auto=format&fit=crop",
    "intro": "溝通與知情同意是所有 BDSM 實踐的核心靈魂。包含事前界線劃分 (Limits)、事中安全詞 (Safewords) 以及事後撫慰 (Aftercare)。",
    "practice": "明確訂立紅燈 (立刻停止)、黃燈 (降低強度/暫停)、綠燈 (正常) 安全詞；事後給予長溫擁抱、保暖毯、補充水分、巧克力與溫和的現實連結對話。",
    "hazard": "缺乏事後撫慰容易導致被動方落入 Sub drop (情緒劇烈低落、空虛) 或 Dom drop (感到強烈愧疚與自責)。",
    "first_aid": "確保每一次實踐後都有充裕的時間進行 Aftercare，關懷彼此的情緒與心理狀態，不論場面多麼短暫都不可省略 Aftercare。",
    "detail_text": "### 事後撫慰 (Aftercare) 的神聖時刻\n\n**落差產生的 Sub drop**：在實踐過程中，身體會分泌大量的腦內啡與多巴胺。當激情退去、神經遞質濃度驟降時，被動方極易陷入強烈的空虛、憂鬱甚至哭泣（Sub Drop）。此時，溫暖的擁抱與愛意確認是唯一的解藥。\n\n**Dom Drop 的忽視**：很多人忽略了主導者也會經歷 Dom Drop。在扮演神祇或施加痛苦後，理智回歸時的反差與道德罪惡感，往往會讓 Dom 感到無比疲憊。因此，Aftercare 是雙向的，互相安撫才是健全關係的展現。"
  },
  {
    "id": "diverse_relations",
    "level": 1,
    "radius": 38,
    "color": "#00F5D4",
    "label": "多元關係與次文化",
    "desc": "多重關係、雙向 Switch、皮革與次文化碰撞。",
    "parent": "bdsm",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop",
    "intro": "探索包含多重伴侶 (Polyamory)、開放式關係、角色雙向切換 (Switching) 與不同次文化 (皮革、ACG、哥德) 碰撞交融的可能性。",
    "practice": "雙方角色互換體驗攻受不同快感、多重親密關係結構、一主多奴 (House 結構)，或結合動漫遊戲人設與皮革美學的實踐風格。",
    "hazard": "角色期待落差、強烈嫉妒心 (Jealousy) 或不安全感處理不當，極易造成情感衝突與信任崩解。",
    "first_aid": "保持極度透明、誠實的對話，建立清晰的關係邊界、時間分配機制與安全性行為默契。",
    "detail_text": "### 重構親密關係的版圖\n\n**Switch 的全知視角**：身為 Switch (可攻可受者)，他們擁有一種獨特的上帝視角。因為他們親自體會過 Sub 被剝奪權力時的恐懼與狂喜，所以在扮演 Dom 時，能展現出更深層的同理心與精準度。\n\n**嫉妒的轉化與 Compersion**：在開放關係中，實踐者學習將「伴侶與他人親密」所帶來的嫉妒感，轉化為一種奇特的興奮與愉悅 (Compersion)。這需要對自我價值有極高的穩定度，以及對伴侶有著不可摧毀的信任。"
  }
];

// ================= 知識網絡圖預設連線 =================
export const graphLinks: GraphLink[] = [
  {
    "source": "bdsm",
    "target": "community_safety"
  },
  {
    "source": "bdsm",
    "target": "bd_main"
  },
  {
    "source": "bdsm",
    "target": "ds_main"
  },
  {
    "source": "bdsm",
    "target": "sm_main"
  },
  {
    "source": "community_safety",
    "target": "consensus_risk"
  },
  {
    "source": "community_safety",
    "target": "events_explore"
  },
  {
    "source": "bd_main",
    "target": "bondage"
  },
  {
    "source": "bondage",
    "target": "shibari"
  },
  {
    "source": "bd_main",
    "target": "sensory_deprivation"
  },
  {
    "source": "bd_main",
    "target": "behavior_training"
  },
  {
    "source": "ds_main",
    "target": "power_flow"
  },
  {
    "source": "ds_main",
    "target": "diverse_relations"
  },
  {
    "source": "ds_main",
    "target": "scenario_play"
  },
  {
    "source": "ds_main",
    "target": "mental_control"
  },
  {
    "source": "ds_main",
    "target": "subculture_cross"
  },
  {
    "source": "sm_main",
    "target": "impact_play"
  },
  {
    "source": "sm_main",
    "target": "sensation_play"
  },
  {
    "source": "sm_main",
    "target": "deep_explore"
  },
  {
    "source": "sm_main",
    "target": "sex_fluids"
  }
];

// ================= 表情符號列表 =================
export const emojiList = ['❤️','🔥','🥺','😂','💦','🥵','😈','😇','🐶','🐱','🐰','🐷','👀','🙈','👏','✨','🩹','⛓️','🍷','🕯️'];

export const quizQuestions: QuizScenarioQuestion[] = [
  // ================= LEVEL 1: ENTRANCE =================
  {
    id: "start",
    type: "scenario",
    imageUrl: "/images/scenarios/1.jpg",
    text: "你收到了一張沒有署名的黑色燙金邀請函。循著地址，你來到一間隱密的地下俱樂部。推開沉重的大門，昏暗的光線與空氣中微醺的香氣撲面而來，映入眼簾的是幾條不同的走廊。你會選擇哪一條？",
    options: [
      { text: "走向傳來低沉鞭聲與喘息的幽暗 VIP 室。", scores: { sadist: 1, maso: 1, primal: 1 }, nextId: "q_dark_room" },
      { text: "走向燈光昏黃、放著爵士樂的吧台區先觀察一番。", scores: { vanilla: 2, voyeur: 1 }, nextId: "q_bar" },
      { text: "走向中央充滿聚光燈，正在進行華麗演出的主舞台。", scores: { exhibitionist: 1, rigger: 1, tied: 1 }, nextId: "q_stage" },
      { text: "走向傳來多人交談與嬉鬧聲的開放式大包廂。", scores: { cuckold: 1, cuckold_maker: 1, voyeur: 1 }, nextId: "q_poly_room" }
    ]
  },

  // ================= LEVEL 2: SETUP =================
  {
    id: "q_dark_room",
    type: "scenario",
    imageUrl: "/images/scenarios/2.jpg",
    text: "VIP 室內瀰漫著皮革與汗水的氣味。昏暗的燈光下，一個戴著面具的人緩緩走向你，手中冷冽的金屬鎖鏈發出細微的碰撞聲。對方將鎖鏈的兩端遞給你，似乎在等待你的決定。你會怎麼做？",
    options: [
      { text: "毫不猶豫地握住把手，用力一扯，讓對方跪下。", scores: { dom: 3, master_mistress: 2 }, nextId: "q_dom_action" },
      { text: "主動把鎖鏈的項圈套在自己脖子上，交出牽繩。", scores: { sub: 3, pet: 2 }, nextId: "q_sub_action" },
      { text: "不接鎖鏈，拉著另一名伴侶進來，笑著說「我們一起玩他吧」。", scores: { dom: 2, cuckold_maker: 3 }, nextId: "q_poly_action" },
      { text: "禮貌地拒絕，表示自己只是來看看，不想弄髒手。", scores: { vanilla: 3, experimenter: 2 }, nextId: "q_neutral_action" }
    ]
  },
  {
    id: "q_bar",
    type: "scenario",
    imageUrl: "/images/scenarios/3.jpg",
    text: "酒保為你遞上一杯色澤濃郁的調酒。旁邊坐著一位充滿魅力的陌生人，對方用挑逗且充滿侵略性的眼神打量著你，指尖輕輕敲擊著玻璃杯邊緣，似乎在等待你的回應。",
    options: [
      { text: "主動靠近，用不容拒絕的語氣命令對方為你點煙。", scores: { dom: 3, master_mistress: 2 }, nextId: "q_dom_action" },
      { text: "露出狡黠的笑容，故意說些反話來測試對方的底線。", scores: { brat: 3, switch: 2 }, nextId: "q_sub_action" },
      { text: "指向遠處自己的伴侶，暗示對方可以去搭訕，你在一旁欣賞。", scores: { cuckold: 3, voyeur: 2 }, nextId: "q_poly_action" },
      { text: "禮貌地點頭微笑，繼續一個人安靜地喝酒觀察四周。", scores: { voyeur: 3, vanilla: 2 }, nextId: "q_neutral_action" }
    ]
  },
  {
    id: "q_stage",
    type: "scenario",
    imageUrl: "/images/scenarios/4.jpg",
    text: "聚光燈下，有人正被深紅色的麻繩懸吊著，繩結在柔軟的肌膚上勒出絕美的幾何圖形。主持人優雅地鞠躬，邀請台下的觀眾上台參與這場充滿張力的互動。",
    options: [
      { text: "走上台，接過主持人的教鞭，掌控全場的節奏。", scores: { dom: 3, sadist: 2 }, nextId: "q_dom_action" },
      { text: "走上台，自願成為下一個被束縛與展示的藝術品。", scores: { sub: 3, exhibitionist: 3 }, nextId: "q_sub_action" },
      { text: "拉著一群朋友一起上台，將這變成一場多人的混亂狂歡。", scores: { exhibitionist: 2, switch: 2 }, nextId: "q_poly_action" },
      { text: "留在台下，用純粹欣賞藝術的眼光，拍下這美麗的一幕。", scores: { experimenter: 3, voyeur: 2 }, nextId: "q_neutral_action" }
    ]
  },
  {
    id: "q_poly_room",
    type: "scenario",
    imageUrl: "/images/scenarios/5.jpg",
    text: "這裡沒有一對一的限制，幾個人正糾纏在一起，粗重的喘息與肌膚摩擦的聲音交織，權力與慾望在空氣中劇烈流動。有人向你伸出了手，溫熱的指尖輕觸你的衣袖，邀請你加入這場遊戲。",
    options: [
      { text: "霸氣地走入人群，指揮所有人該擺出什麼姿勢來取悅你。", scores: { dom: 3, master_mistress: 3 }, nextId: "q_dom_action" },
      { text: "順從地滑入人群中央，享受被多雙手同時撫摸與掌控的感覺。", scores: { sub: 3, maso: 2 }, nextId: "q_sub_action" },
      { text: "欣然接受，並在人群中不斷切換主導與服從的角色。", scores: { switch: 4, brat: 2 }, nextId: "q_poly_action" },
      { text: "搖頭拒絕，坐在舒適的沙發上，安靜地觀賞這場群體演出。", scores: { voyeur: 4, experimenter: 2 }, nextId: "q_neutral_action" }
    ]
  },

  // ================= LEVEL 3 =================
  {
    id: "q_dom_action",
    type: "scenario",
    imageUrl: "/images/scenarios/6.jpg",
    text: "你已經確立了絕對的主導地位。面對眼前仰望著你、等待指令的對象，你可以感受到對方壓抑的期待與心跳。你打算用什麼方式來推進這場感官的饗宴？",
    options: [
      { text: "透過物理的刺激，如冰塊或鞭打，來喚醒對方的每一寸感官。", scores: { sadist: 3, primal: 2 }, nextId: "q_dom_pain" },
      { text: "面對對方調皮的反抗，笑著將其制伏，享受這份馴服的過程。", scores: { brat_tamer: 4, hunter: 2 }, nextId: "q_dom_mind" },
      { text: "邀請其他人加入，讓你的對象在眾人面前展現對你的絕對服從。", scores: { cuckold_maker: 3, voyeur: 2 }, nextId: "q_poly_dom" }
    ]
  },
  {
    id: "q_sub_action",
    type: "scenario",
    imageUrl: "/images/scenarios/7.jpg",
    text: "你已經交出了所有控制權。在這股強大且令人窒息的氣場下，你感受到一種放棄思考的極致輕鬆感。此刻你的內心深處，最渴望經歷什麼樣的對待？",
    options: [
      { text: "渴望粗暴的對待，用純粹的痛楚來換取腦內啡的猛烈釋放。", scores: { maso: 3, primal: 2 }, nextId: "q_sub_pain" },
      { text: "故意做出違規的小動作，挑釁對方，期待換來更嚴厲的懲罰。", scores: { brat: 4, switch: 1 }, nextId: "q_sub_mind" },
      { text: "希望能同時被多人掌控，在混亂與無助中徹底迷失自我。", scores: { sub: 2, cuckold: 3 }, nextId: "q_poly_sub" }
    ]
  },
  {
    id: "q_poly_action",
    type: "scenario",
    imageUrl: "/images/scenarios/8.jpg",
    text: "在這場不限於兩人的狂歡中，權力的流動變得更加複雜且充滿危險的魅力。交錯的視線與撫摸讓你目眩神迷，你決定如何在人群中找到自己的定位？",
    options: [
      { text: "成為眾星拱月的核心，指揮著所有人為你服務。", scores: { cuckold_maker: 3, dom: 2 }, nextId: "q_poly_dom" },
      { text: "將自己交給人群，閉上雙眼，享受來自四面八方的掠奪。", scores: { cuckold: 3, sub: 2 }, nextId: "q_poly_sub" },
      { text: "突然覺得受夠了，你退到一旁的沙發上，轉換為純粹的觀察者。", scores: { voyeur: 3, vanilla: 2 }, nextId: "q_neutral_action" }
    ]
  },
  {
    id: "q_neutral_action",
    type: "scenario",
    imageUrl: "/images/scenarios/1.jpg",
    text: "你退出了混亂的中心，站在一個安全的觀察距離。這個俱樂部的一切對你來說既陌生又充滿吸引力。面對眼前形形色色的互動，你現在的真實想法是？",
    options: [
      { text: "也許不需要太激烈，稍微嘗試一點綑綁或角色扮演也不錯。", scores: { experimenter: 3, vanilla: 2 }, nextId: "q_neutral_mind" },
      { text: "比起親身參與，我更喜歡躲在暗處，仔細觀察他們的表情變化。", scores: { voyeur: 4, cuckold: 1 }, nextId: "q_neutral_watch" },
      { text: "這些都太極端了，我還是比較嚮往浪漫且平等的親密關係。", scores: { vanilla: 4, romantic: 3 }, nextId: "vanilla_ending" }
    ]
  },

  // ================= LEVEL 4 =================
  {
    id: "q_dom_pain",
    type: "scenario",
    imageUrl: "/images/scenarios/2.jpg",
    text: "清脆的聲音在空間中迴盪，對方的肌膚泛起了紅暈，淚水在眼眶中打轉。你欣賞著這份由你親手創造的美麗印記，接下來，你想怎麼做？",
    options: [
      { text: "溫柔地抱住對方，給予親吻與安撫，告訴對方做得很好。", scores: { soft_dom: 3, daddy_mommy: 2 }, nextId: "soft_dom_ending" },
      { text: "毫不留情地繼續，要求對方感謝你給予的這份痛楚。", scores: { sadist: 4, degrader: 2 }, nextId: "extreme_ending" },
      { text: "拿出一條紅色的粗麻繩，將這具美麗的軀體徹底固定。", scores: { rigger: 4 }, nextId: "art_ending" }
    ]
  },
  {
    id: "q_dom_mind",
    type: "scenario",
    imageUrl: "/images/scenarios/3.jpg",
    text: "對方像隻叛逆的幼獸，試圖掙脫你的掌控。你輕易地將其壓制，感受著對方不甘心卻又無能為力的喘息。這種精神上的角力讓你感到無比興奮，你打算如何收尾？",
    options: [
      { text: "用言語羞辱對方的無能，徹底擊潰對方的自尊。", scores: { degrader: 3, mental_control: 3 }, nextId: "mental_ending" },
      { text: "放開對方，給予一個逃跑的機會，然後再次將其狠狠捕獲。", scores: { hunter: 4, sadist: 1 }, nextId: "hunter_ending" },
      { text: "強迫對方穿上特定的服裝，像寵物一樣在地上爬行取悅你。", scores: { owner: 3, pet: 2 }, nextId: "mental_ending" }
    ]
  },
  {
    id: "q_sub_pain",
    type: "scenario",
    imageUrl: "/images/scenarios/4.jpg",
    text: "劇烈的刺痛感伴隨著難以言喻的快感襲來，你的理智逐漸被感官的浪潮吞沒。你感受到自己的極限正在被逼近，這時，你內心的渴望是什麼？",
    options: [
      { text: "希望對方能溫柔地抱緊我，在痛楚後給予我極致的溺愛。", scores: { soft_sub: 3, little: 2 }, nextId: "soft_dom_ending" },
      { text: "希望這份痛楚能再猛烈一點，最好能讓我徹底失去意識。", scores: { maso: 4, primal: 2 }, nextId: "extreme_ending" },
      { text: "希望能被緊緊綑綁，連掙扎的權利都被完全剝奪。", scores: { tied: 4, maso: 1 }, nextId: "art_ending" }
    ]
  },
  {
    id: "q_sub_mind",
    type: "scenario",
    imageUrl: "/images/scenarios/5.jpg",
    text: "你故意挑戰了規則，換來的是被無情地壓制與嚴厲的訓斥。你雖然嘴上不認輸，但身體卻已經因為這份壓迫感而誠實地顫抖。你希望接下來發生什麼事？",
    options: [
      { text: "希望對方用極度羞辱的話語來摧毀我最後的驕傲。", scores: { degradee: 3, mental_control: 2 }, nextId: "mental_ending" },
      { text: "希望能展開一場追逐，讓我在絕望的逃跑中再次被捕獲。", scores: { prey: 4, brat: 2 }, nextId: "hunter_ending" },
      { text: "希望被戴上項圈，成為對方專屬、沒有思考能力的玩物。", scores: { pet: 3, doll: 2 }, nextId: "mental_ending" }
    ]
  },
  {
    id: "q_poly_dom",
    type: "scenario",
    imageUrl: "/images/scenarios/6.jpg",
    text: "你居高臨下地看著你的伴侶在其他人手中輾轉，但所有人的目光與行動最終都必須聽從你的指揮。你是這場盛宴唯一的帝王。你接下來的指令是？",
    options: [
      { text: "命令所有人對你的伴侶進行最嚴厲的懲罰，而你只在一旁冷笑。", scores: { cuckold_maker: 3, sadist: 2 }, nextId: "extreme_ending" },
      { text: "親自下場，在眾人羨慕的目光中，展示你對伴侶的絕對所有權。", scores: { dom: 3, exhibitionist: 2 }, nextId: "poly_ending" },
      { text: "把指揮權暫時交給另一個人，體驗一下權力交替的失控感。", scores: { switch: 3, experimenter: 2 }, nextId: "poly_ending" }
    ]
  },
  {
    id: "q_poly_sub",
    type: "scenario",
    imageUrl: "/images/scenarios/7.jpg",
    text: "你被包圍在人群中央，無數雙陌生的手在你身上遊走。你不知道下一個觸碰你的是誰，也不知道他們會對你做什麼。這種完全未知且無法掌控的狀態讓你感到：",
    options: [
      { text: "極度的興奮，我渴望被他們徹底分享與蹂躪。", scores: { cuckold: 4, maso: 2 }, nextId: "poly_ending" },
      { text: "我只看著我原本的伴侶，希望這一切都能為他帶來愉悅。", scores: { sub: 3, service_sub: 3 }, nextId: "poly_ending" },
      { text: "太失控了，我想要喊出安全詞，結束這場混亂。", scores: { vanilla: 3, romantic: 2 }, nextId: "neutral_ending" }
    ]
  },
  {
    id: "q_neutral_mind",
    type: "scenario",
    imageUrl: "/images/scenarios/8.jpg",
    text: "你決定只在淺水區試探。對方拿來了一些柔軟的絲帶與精美的眼罩，動作溫柔且充滿尊重。當你的視線被遮蔽，只剩下觸覺時，你的感受是？",
    options: [
      { text: "這份被小心翼翼對待的感覺很好，我享受這種輕微的依賴。", scores: { soft_sub: 4, romantic: 2 }, nextId: "soft_dom_ending" },
      { text: "我覺得這種溫柔有些無趣，也許我該主動給對方一點驚喜。", scores: { soft_dom: 3, switch: 2 }, nextId: "hunter_ending" },
      { text: "我還是覺得有些不自在，拿下了眼罩，選擇結束這場遊戲。", scores: { vanilla: 4, experimenter: 1 }, nextId: "neutral_ending" }
    ]
  },
  {
    id: "q_neutral_watch",
    type: "scenario",
    imageUrl: "/images/scenarios/1.jpg",
    text: "你躲在包廂的暗角，手中搖晃著紅酒杯。你看著眼前那些因慾望而扭曲的面孔，看著權力在他們之間轉換。這份置身事外的偷窺感，讓你的內心產生了什麼樣的漣漪？",
    options: [
      { text: "我將自己代入其中，在腦海中想像著自己是那個掌控者。", scores: { voyeur: 3, dom: 1 }, nextId: "mental_ending" },
      { text: "我將自己代入其中，在腦海中想像著自己是那個被懲罰的人。", scores: { voyeur: 3, sub: 1 }, nextId: "art_ending" },
      { text: "我沒有任何代入感，只是純粹欣賞這場充滿野性的人類觀察學。", scores: { voyeur: 4, experimenter: 3 }, nextId: "neutral_ending" }
    ]
  },

  // ================= ENDINGS =================
  {
    id: "vanilla_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/2.jpg",
    isEnding: true,
    title: "純白的救贖",
    text: "推開俱樂部的大門，清晨微涼的風拂過臉頰。那些鐵鍊、皮革與權力的遊戲，彷彿只是一場過於濃烈的夢境。對你而言，真正能觸及靈魂深處的，始終是平等相待的眼眸，與不帶任何壓迫的溫柔擁抱。你在平靜與愛意中，找到了屬於你的歸屬。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "soft_dom_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/3.jpg",
    isEnding: true,
    title: "溫柔的堡壘",
    text: "鐵門關上，但空間裡流動的並非恐懼，而是絕對的安全感。權力在此刻完成了最純粹卻又最溫柔的轉移。這是只屬於你們兩人的絕對領域，沒有嚴酷的懲罰，只有無盡的溺愛與依賴，靈魂在此刻緊緊相依。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "extreme_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/4.jpg",
    isEnding: true,
    title: "破滅的狂歡",
    text: "汗水、淚水與痛楚交織，你們在極限的邊緣瘋狂試探。恐懼與理智早已被拋諸腦後，取而代之的是打破人類所有道德束縛的極致快感。在毀滅與重生的交界處，你們捨棄了人類的偽裝，找到了另一種狂熱的新生。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "hunter_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/5.jpg",
    isEnding: true,
    title: "野性的追逐",
    text: "挑釁、追逐、制伏與逃脫。這是一場永遠不會結束的貓捉老鼠遊戲，充滿了野性的推拉。你們享受著腎上腺素飆升的快感，在每一次充滿張力的反抗與馴服的交鋒中，強烈地確認著彼此的存在與價值。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "art_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/6.jpg",
    isEnding: true,
    title: "靜謐的展品",
    text: "繩索、皮革與華麗的服飾，將肉體束縛出不可思議的姿態。身體在此刻失去了作為人的自主權，昇華為一件供人靜靜觀賞、把玩的藝術品。在無法動彈的窒息與美學的巔峰中，靈魂達到了前所未有的空靈與平靜。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "mental_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/7.jpg",
    isEnding: true,
    title: "深淵的倒影",
    text: "真正的控制從來不需要冰冷的鎖鏈。透過言語的摧毀、羞辱與重新建構，大腦的思想已經被徹底改寫。這是一場沒有任何實體傷痕，卻最讓人無力反抗、深陷其中無法自拔的心理沉淪。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "poly_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/8.jpg",
    isEnding: true,
    title: "迷幻的群星",
    text: "單純的一對一關係早已無法滿足你們。在多人的注視、參與與狂熱的共享中，權力與慾望交織成一張巨大且迷幻的網。無論是作為掌控全局的帝王，還是淪為眾人的玩物，你們在混亂與背德的深淵中找到了終極的愉悅。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  },
  {
    id: "neutral_ending",
    type: "scenario",
    imageUrl: "/images/scenarios/1.jpg",
    isEnding: true,
    title: "優雅的觀測者",
    text: "俱樂部的狂歡仍在繼續，而你始終保持著清醒的距離。對你而言，最安全的距離就是最完美的距離。你更像是一位記錄者或研究員，在這些瘋狂的慾望洪流外，優雅地保有著自己的完整與獨立，冷眼旁觀這一切。",
    options: [
      { text: "深呼吸，進入潛意識圖卡驗證...", scores: {}, nextId: "swipe_intro" }
    ]
  }
];

export const swipeNodes: QuizSwipeQuestion[] = [
  { id: "s1", type: "swipe", nodeId: "shibari", label: "綑綁與限制", activeScores: { rigger: 3, mental_control: 1 }, passiveScores: { tied: 3, doll: 1 } },
  { id: "s2", type: "swipe", nodeId: "spanking", label: "體罰與痛楚", activeScores: { sadist: 3, disciplinarian: 2, brat_tamer: 1 }, passiveScores: { maso: 3, brat: 2 } },
  { id: "s3", type: "swipe", nodeId: "collar", label: "項圈與寵物", activeScores: { owner: 3 }, passiveScores: { pet: 3 } },
  { id: "s4", type: "swipe", nodeId: "praise", label: "言語讚美與安撫", activeScores: { soft_dom: 3, daddy_mommy: 2 }, passiveScores: { soft_sub: 3, little: 2 } },
  { id: "s5", type: "swipe", nodeId: "degradation", label: "言語羞辱與貶低", activeScores: { degrader: 3, sadist: 1 }, passiveScores: { degradee: 3, maso: 1 } },
  { id: "s6", type: "swipe", nodeId: "public_play", label: "公開露出與偷窺", activeScores: { voyeur: 3 }, passiveScores: { exhibitionist: 3 } },
  { id: "s7", type: "swipe", nodeId: "primal", label: "野性追逐與掙扎", activeScores: { hunter: 3, primal: 2 }, passiveScores: { prey: 3, primal: 2 } },
  { id: "s8", type: "swipe", nodeId: "service", label: "侍奉與絕對服從", activeScores: { master_mistress: 3 }, passiveScores: { service_sub: 3, sub: 1 } },
  { id: "s9", type: "swipe", nodeId: "cuckold", label: "綠帽與第三者", activeScores: { cuckold_maker: 3 }, passiveScores: { cuckold: 3 } },
  { id: "s10", type: "swipe", nodeId: "group_play", label: "多人群交與共享", activeScores: { experimenter: 3, extreme: 1 }, passiveScores: { experimenter: 3, exhibitionist: 1 } }
];

// ================= 初始應用資料 =================
export const initialAppData: AppData = {
  stats: {},
  discussions: {
    'lobby_chat': [],
    'lobby_board': []
  },
  userVotes: {},
  userUpvotes: {},
  userEmojis: {}
};

// ================= 工具函式 =================
export const SafeStorage = {
  get: (k: string) => {
    if (typeof window === 'undefined') return null;
    try {
      const data = window.localStorage.getItem(k) || window.sessionStorage.getItem(k);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },
  set: (k: string, v: unknown) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.setItem(k, JSON.stringify(v));
    } catch {
      try {
        window.sessionStorage.setItem(k, JSON.stringify(v));
      } catch { /* 靜默失敗 */ }
    }
  },
  remove: (k: string) => {
    if (typeof window === 'undefined') return;
    try {
      window.localStorage.removeItem(k);
      window.sessionStorage.removeItem(k);
    } catch { /* 靜默失敗 */ }
  }
};

// ================= Supabase 紀錄工具 =================
export const archetypeLabels: Record<string, { title: string, color: string, desc: string }> = {
  dom: { title: "支配者 (Dom)", color: "#D9B650", desc: "喜歡掌握控制權，引導伴侶探索極限。" },
  sub: { title: "服從者 (Sub)", color: "#E8C5C8", desc: "交出控制權，在臣服中獲得安全感與愉悅。" },
  sadist: { title: "施虐狂 (Sadist)", color: "#E08A8A", desc: "從給予伴侶肉體或心理痛楚中獲得快感。" },
  maso: { title: "受虐狂 (Maso)", color: "#B8A9C9", desc: "在痛楚與羞辱中尋求感官的刺激與昇華。" },
  rigger: { title: "繩縛師 (Rigger)", color: "#C5D4B6", desc: "以繩索作為媒介，享受綑綁與控制的藝術。" },
  tied: { title: "受縛者 (Tied)", color: "#D1C6B4", desc: "享受被綑綁的束縛感與無力感。" },
  brat: { title: "頑童 (Brat)", color: "#F3A183", desc: "喜歡調皮搗蛋、挑戰底線，渴望被「教訓」。" },
  disciplinarian: { title: "管教者 (Disciplinarian)", color: "#7B6B59", desc: "喜歡制定規則，並對伴侶進行嚴格的管理與懲罰。" },
  experimenter: { title: "實驗家 (Experimenter)", color: "#8CB9C5", desc: "對新事物充滿好奇，喜歡探索各種未知的玩法。" },
  pet: { title: "寵物 (Pet)", color: "#EAC3DB", desc: "喜歡扮演動物的角色，渴望被主人疼愛與照顧。" },
  owner: { title: "飼主 (Owner)", color: "#A89481", desc: "將伴侶視為寵物，享受飼養與照顧的過程。" },
  little: { title: "幼弱 (Little)", color: "#FFD1DC", desc: "心理狀態退行到孩童時期，渴望被呵護與照顧。" },
  daddy_mommy: { title: "爹地/媽咪", color: "#B3C0A4", desc: "扮演照顧者的角色，給予伴侶絕對的安全感與溺愛。" },
  voyeur: { title: "偷窺狂 (Voyeur)", color: "#8A94A6", desc: "在暗處觀察他人，從觀看中獲得滿足感。" },
  exhibitionist: { title: "露出狂 (Exhibitionist)", color: "#DE7A93", desc: "喜歡在公開場合展示身體或行為，享受被注視的快感。" },
  hunter: { title: "獵人 (Hunter)", color: "#9F4D4D", desc: "享受追逐、捕捉獵物的過程，充滿侵略性。" },
  prey: { title: "獵物 (Prey)", color: "#CBA4A4", desc: "享受被追逐、無處可逃的刺激感。" },
  cuckold: { title: "綠帽癖 (Cuckold)", color: "#6A8A62", desc: "看著伴侶與他人發生關係，從中獲得快感。" },
  cuckold_maker: { title: "綠帽製造者 (Cuckold Maker)", color: "#4A5A44", desc: "享受介入他人關係，並在其中佔據主導地位。" },
  switch: { title: "雙向者 (Switch)", color: "#CBA3D8", desc: "在支配與服從之間靈活切換，擁有雙重屬性。" },
  vanilla: { title: "香草 (Vanilla)", color: "#B5A795", desc: "偏好傳統、浪漫的親密互動，不追求極端刺激。" },
  service_sub: { title: "侍奉者 (Service Sub)", color: "#D5D6EA", desc: "透過無微不至的服侍與照顧主人來獲得滿足感。" },
  master_mistress: { title: "主人 (Master)", color: "#3A3226", desc: "要求絕對的服從，並擁有伴侶的所有權。" },
  primal: { title: "原慾者 (Primal)", color: "#9E6D59", desc: "追求原始、野性、動物本能的互動。" },
  doll: { title: "人偶 (Doll)", color: "#D8CACA", desc: "喜歡被當作沒有靈魂的玩偶般擺佈與裝飾。" },
  mental_control: { title: "精神控制者 (Mental Controller)", color: "#6A5ACD", desc: "喜歡操控他人的思想與心理，使其徹底臣服。" },
  romantic: { title: "浪漫主義者 (Romantic)", color: "#F08080", desc: "在親密關係中追求極致的浪漫與情感連結。" },
  brat_tamer: { title: "馴獸師 (Brat Tamer)", color: "#8B4513", desc: "專門應付調皮的 Brat，享受將其「馴服」的過程。" },
  degrader: { title: "貶低者 (Degrader)", color: "#483D8B", desc: "喜歡透過言語羞辱、貶低伴侶來建立主導地位。" },
  degradee: { title: "受貶低者 (Degradee)", color: "#778899", desc: "從被言語羞辱與貶低中獲得極大的快感。" },
  soft_dom: { title: "溫柔支配者 (Soft Dom)", color: "#DEB887", desc: "不以粗暴的方式，而是用溫柔但堅定的態度引導伴侶。" },
  soft_sub: { title: "溫柔服從者 (Soft Sub)", color: "#F5DEB3", desc: "性格溫順、柔弱，喜歡在溫和的互動中交出控制權。" },
};

export async function logToSupabase(actionType: string, details: Record<string, unknown>) {
  try {
    const { supabase: sb } = await import('@/lib/supabase');
    const { data: { session } } = await sb.auth.getSession();
    if (session?.user?.id) {
      details.user_id = session.user.id;
    }
    await sb.from('visitor_logs').insert({ action_type: actionType, details });
  } catch (e) {
    console.error('Supabase log error:', e);
  }
}

import type { DiscussionPost } from './types';
export function getPostActivityScore(p: DiscussionPost): number {
  const repliesCount = p.replies?.length || 0;
  const emojisCount = p.emojis?.reduce((sum, e) => sum + e.count, 0) || 0;
  return p.upvotes + repliesCount + emojisCount;
}

export function getWafuColor(hex: string): string {
  if (!hex) return "#F4EFE6";
  const map: Record<string, string> = {
    '#E8C5C8': '#D1C6B4', // BDSM (wood)
    '#F3A6A6': '#D4B85C', // Community (yamabuki yellow)
    '#A6C8F3': '#89A090', // BD (uguisu) -> GREEN
    '#E8A6F3': '#7A8B99', // DS (ruri)
    '#F3C8A6': '#9C6E68', // SM (azuki)
  };
  return map[hex.toUpperCase()] || hex;
}
