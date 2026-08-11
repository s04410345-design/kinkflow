import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

export const distinctTenNodes = [
  {
    "id": "bdsm",
    "level": 0,
    "radius": 50,
    "color": "#E8C5C8",
    "label": "BDSM大廳",
    "desc": "探索權力交換、感官刺激與深層信任的起點。",
    "crossLinks": [],
    "image": "https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1200&auto=format&fit=crop",
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
    "image": "https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop",
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
    "image": "https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?q=80&w=1200&auto=format&fit=crop",
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

async function main() {
  console.log('Syncing 10 distinct colored nodes to Supabase quiz_content table...');
  const { data, error } = await supabase
    .from('quiz_content')
    .upsert({
      key_name: 'mindmap_data',
      content: distinctTenNodes,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key_name' });

  if (error) {
    console.error('Error syncing mindmap_data:', error);
  } else {
    console.log(' Successfully synced 10 distinct colored nodes to Supabase quiz_content!');
  }
}

main();
