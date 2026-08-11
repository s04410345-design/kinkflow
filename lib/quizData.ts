// lib/quizData.ts
import type { QuizScores } from './types';

// ==========================================
// 1. 特質與軸心定義 (40 Traits & 10 Axes)
// ==========================================
export const AXES_INFO = [
  { id: 'dom', name: '支配統御', color: '#1E3A8A', type: 'active' },
  { id: 'sadism', name: '施虐破壞', color: '#1E3A8A', type: 'active' },
  { id: 'control', name: '掌控束縛', color: '#1E3A8A', type: 'active' },
  { id: 'care', name: '照顧保護', color: '#1E3A8A', type: 'active' },
  { id: 'sub', name: '臣服侍奉', color: '#7F1D1D', type: 'passive' },
  { id: 'maso', name: '承受痛楚', color: '#7F1D1D', type: 'passive' },
  { id: 'tied', name: '受縛物化', color: '#7F1D1D', type: 'passive' },
  { id: 'spoiled', name: '撒嬌依賴', color: '#7F1D1D', type: 'passive' },
  { id: 'emotional', name: '情感互動', color: '#0F766E', type: 'neutral' },
  { id: 'diverse', name: '多元開放', color: '#0F766E', type: 'neutral' }
];

export const TRAITS_DB: Record<string, { name: string; icon: string; axis: string }> = {
  master: { name: '主宰', icon: '👑', axis: 'dom' }, dom: { name: '支配者', icon: '♟️', axis: 'dom' }, disciplinarian: { name: '規訓者', icon: '📏', axis: 'dom' }, owner: { name: '所有者', icon: '🗝️', axis: 'dom' },
  sadist: { name: '施虐者', icon: '🩸', axis: 'sadism' }, hunter: { name: '獵人', icon: '🐺', axis: 'sadism' }, primal_dom: { name: '狂戰士', icon: '🔥', axis: 'sadism' }, tormentor: { name: '施痛者', icon: '⚡', axis: 'sadism' },
  rigger: { name: '繩師', icon: '🪢', axis: 'control' }, mind_controller: { name: '精神控制', icon: '🧠', axis: 'control' }, restrainer: { name: '空間支配', icon: '⛓️', axis: 'control' }, binder: { name: '拘束者', icon: '🔒', axis: 'control' },
  caregiver: { name: '照顧者', icon: '🍵', axis: 'care' }, daddy_mommy: { name: '爹地媽咪', icon: '🧸', axis: 'care' }, soft_dom: { name: '溫柔支配', icon: '🕊️', axis: 'care' }, protector: { name: '守護者', icon: '🛡️', axis: 'care' },
  service_sub: { name: '侍奉者', icon: '☕', axis: 'sub' }, sub: { name: '臣服者', icon: '🧎', axis: 'sub' }, slave: { name: '奴隸', icon: '🏷️', axis: 'sub' }, worshipper: { name: '崇拜者', icon: '🙏', axis: 'sub' },
  masochist: { name: '受虐者', icon: '🥀', axis: 'maso' }, prey: { name: '獵物', icon: '🐰', axis: 'maso' }, sufferer: { name: '承受者', icon: '🩹', axis: 'maso' }, edge_seeker: { name: '邊緣試探', icon: '🌪️', axis: 'maso' },
  tied: { name: '受縛物', icon: '🎀', axis: 'tied' }, doll: { name: '人偶', icon: '🎎', axis: 'tied' }, pet: { name: '寵物', icon: '🐾', axis: 'tied' }, exhibit: { name: '展品', icon: '🖼️', axis: 'tied' },
  brat: { name: '反叛調皮', icon: '😼', axis: 'spoiled' }, little: { name: '幼態', icon: '🍼', axis: 'spoiled' }, soft_sub: { name: '溫柔臣服', icon: '☁️', axis: 'spoiled' }, needy: { name: '索求者', icon: '🥺', axis: 'spoiled' },
  vanilla: { name: '純愛', icon: '🤍', axis: 'emotional' }, sapiosexual: { name: '靈魂伴侶', icon: '📖', axis: 'emotional' }, demisexual: { name: '專一依附', icon: '💞', axis: 'emotional' }, aftercare: { name: '撫慰者', icon: '🩹', axis: 'emotional' },
  switch: { name: '雙向者', icon: '☯️', axis: 'diverse' }, voyeur: { name: '窺視者', icon: '👁️', axis: 'diverse' }, exhibitionist: { name: '展露者', icon: '✨', axis: 'diverse' }, poly: { name: '綠帽共享', icon: '🎭', axis: 'diverse' }
};

// ==========================================
// 2. 結局定義 (6 Poetic Endings)
// ==========================================
export const ENDINGS_DB = [
  { id: 'sovereign', image: 'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?q=80&w=1200&auto=format&fit=crop', title: '【夜幕的執棋者】', subtitle: 'Master of the Silent Veil', icon: '👑', commentary: '當晨光劃破暗室的絲絨窗簾，你站在權力的頂端。每一次呼吸都是對靈魂的絕對掌控，在寂靜的臣服中，你們成為彼此唯一的王國。' },
  { id: 'abyss', image: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?q=80&w=1200&auto=format&fit=crop', title: '【白瓷的獻祭】', subtitle: 'White Porcelain Sacrifice', icon: '🥀', commentary: '鐵籠的門未曾上鎖，但你的靈魂早已自願上銬。在徹底的失控與交託裡，你找到了最深沉的安寧與解放。' },
  { id: 'fortress', image: 'https://images.unsplash.com/photo-1544717305-2782549b5136?q=80&w=1200&auto=format&fit=crop', title: '【晨星的搖籃】', subtitle: 'Cradle of the Morning Star', icon: '🤍', commentary: '沒有冰冷的鐵器與鞭笞，這裡只有十指緊扣的餘溫與輕聲的呢喃。你們在風暴之外築起一座避風港，將彼此破碎的靈魂細細縫補。' },
  { id: 'canary', image: 'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?q=80&w=1200&auto=format&fit=crop', title: '【蜜糖鎖鏈】', subtitle: 'Chains of Honey', icon: '🐤', commentary: '你帶著幾分孩子氣的任性與依賴，在每一次被懲罰與被寵溺之間尋找平衡。當大手撫摸你的發頂時，所有的反叛都化為甘之如飴的甜。' },
  { id: 'operator', image: 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?q=80&w=1200&auto=format&fit=crop', title: '【莫比烏斯之宴】', subtitle: 'Mobius Banquet', icon: '🎭', commentary: '你在多重的視線與關係中穿梭自如，冷眼旁觀著世俗的道德邊界。你享受共享與交織的狂熱，將每一段關係都化為一場精密的行為藝術。' },
  { id: 'destroyer', image: 'https://images.unsplash.com/photo-1514533450685-4493e01d1fdc?q=80&w=1200&auto=format&fit=crop', title: '【猩紅月全食】', subtitle: 'Crimson Eclipse', icon: '🔥', commentary: '黑夜是你的畫布，皮鞭與低吼是你的顏料。你享受血脈僨張的原始狩獵，用絕對的刺激與痛覺試探生命的極限。' },
  { id: 'doll', image: 'https://images.unsplash.com/photo-1507679799987-c73779587ccf?q=80&w=1200&auto=format&fit=crop', title: '【銀絲之繭】', subtitle: 'Silver Silk Cocoon', icon: '🎀', commentary: '視覺被剝奪，但其他感官卻無比清晰。你化作一具精緻的人偶，靜靜等待著下一雙觸碰你的手，享受純粹的物化與靜止。' }
];

// ==========================================

// 4. 網狀情境題庫 (Graph-based Text Adventure)
// ==========================================
export type ScenarioNode = {
  id: string;
  level: number;
  title: string;
  desc: string;
  options: {
    text: string;
    nextNodeId: string;
    impacts: Partial<Record<keyof typeof TRAITS_DB, number>>;
  }[];
};

// 這是整個圖(Graph)，選項會引導到不同的節點
export const SCENARIO_GRAPH: Record<string, ScenarioNode> = {
  // --- LEVEL 1 ---
  start: {
    id: 'start', level: 1, title: '第一夜：隱秘夜宴',
    desc: '您收到一枚漆黑的火漆印信，來到一場沒有名字的夜宴。大廳中央光影斑駁，您首先被什麼所吸引？',
    options: [
      { text: '一雙居高臨下、帶著冷冽審視意味的眼眸。', nextNodeId: 'l2_sub_hall', impacts: { sub: 10, worshipper: 10, masochist: 5 } },
      { text: '展示台上，一條做工考究、泛著深邃光澤的皮革拘束帶。', nextNodeId: 'l2_dom_room', impacts: { dom: 10, master: 10, owner: 5 } },
      { text: '角落裡，某個人因為過度緊繃而微微發顫的雙肩。', nextNodeId: 'l2_care_corridor', impacts: { caregiver: 10, protector: 10, sadist: 5 } },
      { text: '舞池中央，兩名戴著面具、不斷交換主從角色的舞者。', nextNodeId: 'l2_mirror_maze', impacts: { switch: 15, voyeur: 10, poly: 5 } }
    ]
  },

  // --- LEVEL 2 ---
  l2_sub_hall: {
    id: 'l2_sub_hall', level: 2, title: '第二夜：仰望者之廳',
    desc: '那雙眼眸的主人走到您面前，遞給您一杯酒，並用指尖輕挑您的下巴。您的反應是？',
    options: [
      { text: '順從地喝下，將自己的雙手交疊遞給對方。', nextNodeId: 'l3_velvet_nest', impacts: { slave: 15, sub: 10, service_sub: 10 } },
      { text: '偏過頭躲開，帶著挑釁的笑意看著他。', nextNodeId: 'l3_truth_chamber', impacts: { brat: 15, edge_seeker: 10, switch: 5 } },
      { text: '跪下，輕吻對方的指尖，祈求更強烈的對待。', nextNodeId: 'l3_punishment_stage', impacts: { masochist: 15, worshipper: 10, sufferer: 10 } },
      { text: '接過酒杯，但刻意退入人群中，享受被他目光追逐的感覺。', nextNodeId: 'l3_chaos_floor', impacts: { exhibitionist: 15, switch: 10, prey: 5 } }
    ]
  },
  l2_dom_room: {
    id: 'l2_dom_room', level: 2, title: '第二夜：掌控者之室',
    desc: '您拿起了那條拘束帶，這時一名侍者低著頭走入房間，等候您的指示。',
    options: [
      { text: '命令他轉過身，用拘束帶將他的雙手牢牢鎖在背後。', nextNodeId: 'l3_truth_chamber', impacts: { rigger: 15, binder: 10, restrainer: 10 } },
      { text: '用拘束帶輕拍他的臉頰，觀察他因恐懼與期待而顫抖的模樣。', nextNodeId: 'l3_punishment_stage', impacts: { sadist: 15, hunter: 10, tormentor: 10 } },
      { text: '解開他的領口，用拘束帶作為牽引，溫柔地引導他坐下。', nextNodeId: 'l3_velvet_nest', impacts: { soft_dom: 15, owner: 10, daddy_mommy: 5 } },
      { text: '將拘束帶扔在地上，打開門，讓外面的賓客一起觀賞他撿起的姿態。', nextNodeId: 'l3_chaos_floor', impacts: { poly: 15, dom: 10, mind_controller: 5 } }
    ]
  },
  l2_care_corridor: {
    id: 'l2_care_corridor', level: 2, title: '第二夜：庇護與狩獵之廊',
    desc: '你走向那個發顫的人，他抬起頭，眼中滿是無助，卻又帶著一絲抗拒。你會怎麼做？',
    options: [
      { text: '溫柔地披上外套，輕聲告訴他「這裡很安全，跟著我」。', nextNodeId: 'l3_velvet_nest', impacts: { caregiver: 15, protector: 10, soft_dom: 10 } },
      { text: '捏住他的下巴，逼迫他直視你：「如果你連這點膽量都沒有，就乖乖聽話。」', nextNodeId: 'l3_truth_chamber', impacts: { dom: 15, master: 10, disciplinarian: 10 } },
      { text: '覺得他的脆弱非常迷人，甚至想看他哭泣求饒的模樣。', nextNodeId: 'l3_punishment_stage', impacts: { sadist: 15, primal_dom: 10, hunter: 5 } },
      { text: '什麼也不做，只是靜靜坐在他身邊，享受這份脆弱的共鳴。', nextNodeId: 'l3_chaos_floor', impacts: { vanilla: 15, demisexual: 10, aftercare: 5 } }
    ]
  },
  l2_mirror_maze: {
    id: 'l2_mirror_maze', level: 2, title: '第二夜：幻鏡迷宮',
    desc: '您步入舞池，周圍全是單向鏡。舞者們向您伸出手，邀請您加入這場沒有規則的狂歡。',
    options: [
      { text: '奪過主導權，強勢地引導舞步，讓所有人跟隨您的節奏。', nextNodeId: 'l3_truth_chamber', impacts: { dom: 15, exhibitionist: 10, switch: 10 } },
      { text: '閉上眼，任由未知的雙手在身上游走，享受徹底的失控。', nextNodeId: 'l3_punishment_stage', impacts: { tied: 15, doll: 10, exhibit: 10 } },
      { text: '只選擇與其中一人共舞，並在混亂中緊緊護住對方。', nextNodeId: 'l3_velvet_nest', impacts: { demisexual: 15, protector: 10, vanilla: 5 } },
      { text: '退到鏡子後方，在暗處靜靜窺視舞池中交纏的肉體。', nextNodeId: 'l3_chaos_floor', impacts: { voyeur: 15, sapiosexual: 10, poly: 5 } }
    ]
  },

  // --- LEVEL 3 ---
  l3_velvet_nest: {
    id: 'l3_velvet_nest', level: 3, title: '第三夜：絲絨鳥巢',
    desc: '氣氛變得私密。對方依偎在您懷中（或您依偎在對方懷中），突然，他輕聲提出了一個稍微越界的要求。',
    options: [
      { text: '笑著拒絕，並用溫柔但不可抗拒的方式定下規矩。', nextNodeId: 'l4_absolute_order', impacts: { soft_dom: 15, disciplinarian: 10, caregiver: 5 } },
      { text: '毫無保留地答應，只要能讓對方開心，您願意退化成索求的孩子。', nextNodeId: 'l4_deep_connection', impacts: { little: 15, needy: 10, soft_sub: 10 } },
      { text: '故意反向操作，用些許的痛楚取代他的要求，看他的反應。', nextNodeId: 'l4_conflict_edge', impacts: { switch: 15, edge_seeker: 10, brat: 5 } },
      { text: '提議邀請第三個人加入，讓這份親密變得更加複雜。', nextNodeId: 'l4_public_display', impacts: { poly: 15, diverse: 10, switch: 5 } }
    ]
  },
  l3_truth_chamber: {
    id: 'l3_truth_chamber', level: 3, title: '第三夜：真理之室',
    desc: '房間裡只有一張椅子與一盞聚光燈。權力的天平已經傾斜，現在是立下契約的時刻。',
    options: [
      { text: '制定極度嚴格的規則，任何微小的犯錯都將面臨嚴厲的懲戒。', nextNodeId: 'l4_absolute_order', impacts: { disciplinarian: 15, master: 10, mind_controller: 10 } },
      { text: '放棄所有權利，簽下空白契約，將身心徹底交給對方。', nextNodeId: 'l4_deep_connection', impacts: { slave: 15, worshipper: 10, sub: 10 } },
      { text: '在契約上寫下極端的生理挑戰，追求痛覺與恐懼的極限。', nextNodeId: 'l4_conflict_edge', impacts: { tormentor: 15, sadist: 10, masochist: 5 } },
      { text: '將契約公開，讓全場的賓客共同監督這份主從關係。', nextNodeId: 'l4_public_display', impacts: { exhibitionist: 15, owner: 10, tied: 5 } }
    ]
  },
  l3_punishment_stage: {
    id: 'l3_punishment_stage', level: 3, title: '第三夜：刑罰高台',
    desc: '刑具碰撞的聲音迴盪。極限的拉扯中，其中一方已經瀕臨崩潰邊緣，眼角泛著淚光。',
    options: [
      { text: '立刻停止一切動作，將對方緊緊抱入懷中，進行長時間的事後安撫。', nextNodeId: 'l4_deep_connection', impacts: { aftercare: 20, caregiver: 10, vanilla: 5 } },
      { text: '無視眼淚，甚至加重力道，直到徹底摧毀最後一絲理智。', nextNodeId: 'l4_conflict_edge', impacts: { primal_dom: 15, sadist: 15, hunter: 10 } },
      { text: '冷酷地命令對方憋住眼淚，否則將面臨翻倍的懲罰。', nextNodeId: 'l4_absolute_order', impacts: { mind_controller: 15, disciplinarian: 10, dom: 5 } },
      { text: '享受這份痛楚，主動引導對方對自己施加更殘酷的對待。', nextNodeId: 'l4_conflict_edge', impacts: { masochist: 20, sufferer: 15, edge_seeker: 10 } }
    ]
  },
  l3_chaos_floor: {
    id: 'l3_chaos_floor', level: 3, title: '第三夜：混亂舞池',
    desc: '理智的界線開始模糊，多重視線交錯。有人試圖將您拉入一場群體的狂歡。',
    options: [
      { text: '站在高處，指揮下方的混亂，像操弄棋子般安排他們的動作。', nextNodeId: 'l4_absolute_order', impacts: { mind_controller: 15, master: 10, voyeur: 10 } },
      { text: '拒絕群體，拉著您唯一在意的人逃離喧囂，躲進安靜的角落。', nextNodeId: 'l4_deep_connection', impacts: { demisexual: 15, vanilla: 10, protector: 5 } },
      { text: '戴上項圈，任由不同的人在您身上留下印記，成為全場的焦點。', nextNodeId: 'l4_public_display', impacts: { exhibit: 15, exhibitionist: 10, tied: 10 } },
      { text: '遊走在人群中，時而施虐、時而臣服，享受身分轉換的刺激。', nextNodeId: 'l4_conflict_edge', impacts: { switch: 20, brat: 10, edge_seeker: 10 } }
    ]
  },

  // --- LEVEL 4 ---
  l4_absolute_order: {
    id: 'l4_absolute_order', level: 4, title: '第四夜：絕對秩序',
    desc: '一切都在規則之下運行。但過度的壓抑總會帶來反彈，對方面露不悅，試圖挑戰您的底線（或您試圖挑戰對方的底線）。',
    options: [
      { text: '用不容置疑的氣場與懲戒，將反叛徹底碾碎。', nextNodeId: 'l5_final_test_dom', impacts: { master: 15, disciplinarian: 15, dom: 10 } },
      { text: '巧妙地利用心理話術，讓對方在不知不覺中主動認錯。', nextNodeId: 'l5_final_test_chaos', impacts: { mind_controller: 20, sapiosexual: 10, rigger: 5 } },
      { text: '放棄抵抗，低頭親吻對方的靴尖，承認自己的越界。', nextNodeId: 'l5_final_test_sub', impacts: { worshipper: 15, slave: 10, service_sub: 10 } },
      { text: '化解僵局，用溫柔的撫摸代替懲罰，讓對方感到愧疚而服從。', nextNodeId: 'l5_final_test_care', impacts: { soft_dom: 15, caregiver: 10, daddy_mommy: 10 } }
    ]
  },
  l4_deep_connection: {
    id: 'l4_deep_connection', level: 4, title: '第四夜：靈魂共振',
    desc: '在最深層的交流後，你們看見了彼此靈魂的裂痕。此時，您最渴望從對方身上得到什麼？',
    options: [
      { text: '一句「你完全屬於我」的絕對佔有宣言。', nextNodeId: 'l5_final_test_dom', impacts: { owner: 20, protector: 10, master: 5 } },
      { text: '一個溫暖的擁抱，與像哄孩子般的輕聲呢喃。', nextNodeId: 'l5_final_test_care', impacts: { little: 15, needy: 15, soft_sub: 10 } },
      { text: '毫無保留的奉獻，對方願意為您承受極端的肉體痛楚。', nextNodeId: 'l5_final_test_sub', impacts: { sadist: 15, masochist: 15, switch: 10 } },
      { text: '不需要言語，只需要一個能看透彼此黑暗面的眼神。', nextNodeId: 'l5_final_test_chaos', impacts: { sapiosexual: 20, demisexual: 10, vanilla: 5 } }
    ]
  },
  l4_conflict_edge: {
    id: 'l4_conflict_edge', level: 4, title: '第四夜：極限邊緣',
    desc: '感官已經被推到了極限。痛覺、快感與恐懼交織成網。您還要繼續嗎？',
    options: [
      { text: '繼續加碼。解開最後的束縛，迎接徹底的野性與毀滅。', nextNodeId: 'l5_final_test_dom', impacts: { primal_dom: 20, hunter: 15, edge_seeker: 10 } },
      { text: '停止動作。將對方從邊緣拉回，用溫水與親吻洗去血痕。', nextNodeId: 'l5_final_test_care', impacts: { aftercare: 20, caregiver: 15, soft_dom: 10 } },
      { text: '雙手奉上刑具，祈求對方不要停下，甚至給予更重的懲罰。', nextNodeId: 'l5_final_test_sub', impacts: { sufferer: 20, masochist: 15, prey: 10 } },
      { text: '切換角色。剛才是你承受，現在輪到你施加（或反之）。', nextNodeId: 'l5_final_test_chaos', impacts: { switch: 25, brat: 10, tormentor: 5 } }
    ]
  },
  l4_public_display: {
    id: 'l4_public_display', level: 4, title: '第四夜：公開展覽',
    desc: '眾人的目光聚焦在你們身上。每一次動作都會引來周圍的低語與喘息。',
    options: [
      { text: '驕傲地展示您的所有物，享受他人羨慕與敬畏的目光。', nextNodeId: 'l5_final_test_dom', impacts: { owner: 20, dom: 10, voyeur: 10 } },
      { text: '像個精緻的人偶般保持完美姿態，陶醉於被觀賞的羞恥感中。', nextNodeId: 'l5_final_test_sub', impacts: { exhibit: 20, doll: 15, exhibitionist: 10 } },
      { text: '邀請周圍的人加入，將私密的支配轉變為群體的共享狂歡。', nextNodeId: 'l5_final_test_chaos', impacts: { poly: 20, diverse: 15, switch: 5 } },
      { text: '突然感到不適，拉起衣服，帶著名義上的伴侶迅速離開現場。', nextNodeId: 'l5_final_test_care', impacts: { demisexual: 15, vanilla: 10, soft_sub: 10 } }
    ]
  },

  // --- LEVEL 5 ---
  l5_final_test_dom: {
    id: 'l5_final_test_dom', level: 5, title: '第五夜：王座的考驗',
    desc: '房間中央放著一張王座。當您坐下（或跪在王座前）時，您心底最深的渴望是？',
    options: [
      { text: '萬物皆在我的掌控之中，無人能忤逆。', nextNodeId: 'l6_dawn_dom', impacts: { master: 25, dom: 15, disciplinarian: 10 } },
      { text: '用恐懼與痛楚，雕刻出最完美的藝術品。', nextNodeId: 'l6_dawn_dom', impacts: { sadist: 20, tormentor: 15, hunter: 10 } },
      { text: '我願為王座上的人，獻出最後一絲尊嚴。', nextNodeId: 'l6_dawn_dom', impacts: { slave: 20, worshipper: 15, sub: 10 } },
      { text: '權力不過是一場遊戲，我隨時可以推翻這座王座。', nextNodeId: 'l6_dawn_dom', impacts: { brat: 20, switch: 15, edge_seeker: 10 } }
    ]
  },
  l5_final_test_sub: {
    id: 'l5_final_test_sub', level: 5, title: '第五夜：深淵的呼喚',
    desc: '黑暗包圍了您。在徹底失去視覺與自由的狀態下，您的本能反應是？',
    options: [
      { text: '恐懼但也極度興奮，期待未知的觸碰與痛楚降臨。', nextNodeId: 'l6_dawn_sub', impacts: { masochist: 25, sufferer: 15, tied: 10 } },
      { text: '完全放空大腦，像個沒有生命的物件般任人擺佈。', nextNodeId: 'l6_dawn_sub', impacts: { doll: 20, tied: 20, exhibit: 10 } },
      { text: '哭泣著索求主人的聲音，渴望一句安慰。', nextNodeId: 'l6_dawn_sub', impacts: { needy: 20, little: 15, soft_sub: 10 } },
      { text: '在黑暗中暗自籌劃，等待時機反咬一口。', nextNodeId: 'l6_dawn_sub', impacts: { hunter: 20, switch: 15, primal_dom: 10 } }
    ]
  },
  l5_final_test_care: {
    id: 'l5_final_test_care', level: 5, title: '第五夜：最後的庇護所',
    desc: '爐火劈啪作響，這是夜宴中最寧靜的一角。您希望這個夜晚如何收尾？',
    options: [
      { text: '將對方擁入懷中，輕輕撫平他所有的傷痕與不安。', nextNodeId: 'l6_dawn_care', impacts: { caregiver: 25, soft_dom: 15, daddy_mommy: 10 } },
      { text: '吸吮著對方的指尖，安心地在他的懷裡睡去。', nextNodeId: 'l6_dawn_care', impacts: { little: 20, pet: 15, needy: 10 } },
      { text: '這份溫柔太沉重，我需要一點粗暴來確認自己的存在。', nextNodeId: 'l6_dawn_care', impacts: { masochist: 15, brat: 15, edge_seeker: 10 } },
      { text: '並肩而坐，進行一場深刻而平等的靈魂對話。', nextNodeId: 'l6_dawn_care', impacts: { sapiosexual: 20, vanilla: 15, demisexual: 10 } }
    ]
  },
  l5_final_test_chaos: {
    id: 'l5_final_test_chaos', level: 5, title: '第五夜：混沌的謎底',
    desc: '無數面鏡子倒映出您的身影，每一面都是不同的您。您決定擊碎哪一面？',
    options: [
      { text: '擊碎那個虛偽的正常人，釋放心中被壓抑的野獸。', nextNodeId: 'l6_dawn_chaos', impacts: { primal_dom: 20, exhibitionist: 15, sadist: 10 } },
      { text: '擊碎施虐者的面具，展露自己其實極度渴望被掌控的內心。', nextNodeId: 'l6_dawn_chaos', impacts: { switch: 25, masochist: 15, sub: 10 } },
      { text: '不擊碎任何鏡子，反而邀請更多人走入迷宮，讓混亂加劇。', nextNodeId: 'l6_dawn_chaos', impacts: { poly: 20, voyeur: 15, diverse: 10 } },
      { text: '用精密的邏輯與話術，將鏡迷宮改造成自己專屬的心理實驗室。', nextNodeId: 'l6_dawn_chaos', impacts: { mind_controller: 25, restrainer: 10, sapiosexual: 10 } }
    ]
  },

  // --- LEVEL 6 (Final) ---
  l6_dawn_dom: {
    id: 'l6_dawn_dom', level: 6, title: '破曉：權力的極致',
    desc: '天色漸白，晨光透過彩繪玻璃灑在王座上。您站在這權力的頂點，看著階梯下臣服的人們，您最後的決定是？',
    options: [
      { text: '賜予他們一個永遠無法解開的誓言，鞏固絕對的統治。', nextNodeId: 'result', impacts: { master: 20, dom: 10, owner: 10 } },
      { text: '走下階梯，親吻那個最虔誠的信徒，將權柄交給他。', nextNodeId: 'result', impacts: { switch: 15, sub: 15, care: 10 } },
      { text: '將王權的象徵隨手拋棄，笑著說這不過是一場遊戲。', nextNodeId: 'result', impacts: { brat: 20, exhibitionist: 10, poly: 10 } },
      { text: '感到高處不勝寒，主動戴上項圈，祈求另一個能掌控自己的人出現。', nextNodeId: 'result', impacts: { masochist: 20, sub: 15, tied: 10 } }
    ]
  },
  l6_dawn_sub: {
    id: 'l6_dawn_sub', level: 6, title: '破曉：徹底的奉獻',
    desc: '微弱的晨光刺破了長夜的黑暗。您身上的束縛依然沉重，但內心卻無比輕盈。面對即將結束的夜宴，您希望如何度過最後的時刻？',
    options: [
      { text: '閉上雙眼，靜靜等待主人最後一次的獎賞或懲罰。', nextNodeId: 'result', impacts: { slave: 20, sub: 10, worshipper: 10 } },
      { text: '主動扯下眼罩，凝視著主人的眼睛，要求一次平等的親吻。', nextNodeId: 'result', impacts: { switch: 15, brat: 15, emotional: 10 } },
      { text: '向眾人展示您身上的傷痕與印記，驕傲地宣告自己的歸屬。', nextNodeId: 'result', impacts: { exhibit: 20, exhibitionist: 15, tied: 10 } },
      { text: '從主人的手中奪過皮鞭，將他壓制在地，嘴角揚起一抹危險的微笑。', nextNodeId: 'result', impacts: { sadist: 20, dom: 15, switch: 10 } }
    ]
  },
  l6_dawn_care: {
    id: 'l6_dawn_care', level: 6, title: '破曉：黎明的微光',
    desc: '清晨的薄霧籠罩著避風港。昨夜的狂亂與痛楚都已平息，只剩下彼此的呼吸聲。您看著懷中（或抱著您）的人，開口說道：',
    options: [
      { text: '「無論未來多麼黑暗，我都會繼續為你遮風擋雨。」', nextNodeId: 'result', impacts: { caregiver: 20, protector: 15, soft_dom: 10 } },
      { text: '「我累了，今天可以換你來照顧我、支配我嗎？」', nextNodeId: 'result', impacts: { little: 20, sub: 15, switch: 10 } },
      { text: '「我們之間的連結不需要言語，只需要絕對的服從。」', nextNodeId: 'result', impacts: { disciplinarian: 20, master: 10, dom: 10 } },
      { text: '「走出這扇門後，我們就裝作互不相識的陌生人吧。」', nextNodeId: 'result', impacts: { poly: 20, edge_seeker: 15, diverse: 10 } }
    ]
  },
  l6_dawn_chaos: {
    id: 'l6_dawn_chaos', level: 6, title: '破曉：無盡的迴圈',
    desc: '鏡迷宮在破曉的陽光下折射出絢爛的光斑。身份、角色與道德的界線都已消融。在離開迷宮之前，您最後的回眸看見了什麼？',
    options: [
      { text: '無數個不同面向的自己，正與不同的人進行著極致的糾纏。', nextNodeId: 'result', impacts: { poly: 20, diverse: 15, voyeur: 10 } },
      { text: '一個被您精確操縱、深陷幻覺而無法自拔的完美獵物。', nextNodeId: 'result', impacts: { mind_controller: 20, dom: 15, sadist: 10 } },
      { text: '自己正被無數雙手牢牢束縛，享受著徹底被剝奪意志的快感。', nextNodeId: 'result', impacts: { tied: 20, sub: 15, masochist: 10 } },
      { text: '其實這一切都只是一場遊戲，您笑著推開大門，迎向平凡的日常。', nextNodeId: 'result', impacts: { vanilla: 20, switch: 10, sapiosexual: 10 } }
    ]
  }
};

// ==========================================
// 5. 潛意識圖卡 (13 Cards, 1~5 Scoring)
// ==========================================
export const CARDS = [
  { id: 'rope', title: '繩縛藝術 (Rope Art)', actTitle: '我想綑綁', passTitle: '我想受縛', actImpact: ['rigger', 'binder'], passImpact: ['tied', 'exhibit'] },
  { id: 'restraint', title: '拘束控制 (Restraint & Control)', actTitle: '限制行動', passTitle: '交出自由', actImpact: ['restrainer', 'dom'], passImpact: ['doll', 'sub'] },
  { id: 'pain', title: '痛楚邊緣 (Pain & Edge)', actTitle: '施加痛楚', passTitle: '承受痛覺', actImpact: ['sadist', 'tormentor'], passImpact: ['masochist', 'sufferer'] },
  { id: 'power', title: '權慾流動 (Power Dynamics)', actTitle: '發號施令', passTitle: '絕對服從', actImpact: ['master', 'owner'], passImpact: ['slave', 'worshipper'] },
  { id: 'exhibition', title: '暴露與窺視 (Exhibition/Voyeur)', actTitle: '暗中窺視', passTitle: '公開展露', actImpact: ['voyeur', 'switch'], passImpact: ['exhibitionist', 'exhibit'] },
  { id: 'cuckold', title: '伴侶共享 (Sharing & Cuckold)', actTitle: '推向他人', passTitle: '被共享', actImpact: ['poly', 'voyeur'], passImpact: ['poly', 'switch'] },
  { id: 'pet', title: '寵物與物化 (Pet & Object)', actTitle: '飼養調教', passTitle: '戴上項圈', actImpact: ['owner', 'disciplinarian'], passImpact: ['pet', 'doll'] },
  { id: 'humiliation', title: '人格羞辱 (Humiliation)', actTitle: '言語貶低', passTitle: '承受羞辱', actImpact: ['hunter', 'primal_dom'], passImpact: ['prey', 'edge_seeker'] },
  { id: 'pamper', title: '照顧寵溺 (Care & Pamper)', actTitle: '全心照顧', passTitle: '退化依賴', actImpact: ['daddy_mommy', 'caregiver'], passImpact: ['little', 'needy'] },
  { id: 'fear', title: '獵捕與恐懼 (Primal & Fear)', actTitle: '化身野獸', passTitle: '無力逃脫', actImpact: ['hunter', 'primal_dom'], passImpact: ['prey', 'edge_seeker'] },
  { id: 'sensory', title: '感官刺激 (Sensory Stimulate)', actTitle: '剝奪感官', passTitle: '陷入未知', actImpact: ['tormentor', 'restrainer'], passImpact: ['sufferer', 'tied'] },
  { id: 'aftercare', title: '溫柔安撫 (Soft & Aftercare)', actTitle: '事後安撫', passTitle: '渴望擁抱', actImpact: ['soft_dom', 'aftercare'], passImpact: ['soft_sub', 'vanilla'] },
  { id: 'mind_control', title: '精神操控 (Mind Control)', actTitle: '洗腦重塑', passTitle: '放棄思考', actImpact: ['mind_controller', 'disciplinarian'], passImpact: ['worshipper', 'service_sub'] }
];
