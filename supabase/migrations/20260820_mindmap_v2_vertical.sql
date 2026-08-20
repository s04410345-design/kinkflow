-- KinkFlow Mind Map V2：BDSM 0 階 → BD／DS／SM／社群 1 階 → 2／3 階主題
-- 非破壞性：先備份現有 mindmap_data，再以固定 20 節點資料初始化正式與草稿內容。
-- 本 migration 僅建立檔案供審查；未在 production 執行。

begin;

insert into public.quiz_content (key_name, content)
select 'mindmap_data_legacy_20260820', content
from public.quiz_content
where key_name = 'mindmap_data'
on conflict (key_name) do nothing;

insert into public.quiz_content (key_name, content)
values
(
  'mindmap_data',
  $mindmap$
[
  {"id":"bdsm","level":0,"radius":54,"color":"#D9B650","label":"BDSM","desc":"探索權力交換、身體感受、關係信任與社群文化的入口。","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_bdsm.svg","shape":"plaque","crossLinks":[],"isHotTopicHub":false,"allowContentTag":false},
  {"id":"bd","level":1,"radius":44,"color":"#8F4B3A","label":"BD","desc":"束縛、紀律、器具與行為規範的主題入口。","parent":"bdsm","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L0.svg","shape":"hexagon","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"ds","level":1,"radius":44,"color":"#5B7565","label":"DS","desc":"支配、臣服、權力流動與關係角色的主題入口。","parent":"bdsm","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"sm","level":1,"radius":44,"color":"#A46B3C","label":"SM","desc":"痛覺、衝擊、感官與本能探索的主題入口。","parent":"bdsm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm.svg","shape":"drop","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"community","level":1,"radius":44,"color":"#4D7180","label":"社群","desc":"知情同意、溝通、安全、文化與交流的共同基礎。","parent":"bdsm","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community.svg","shape":"badge","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"bd_bondage_tools","level":2,"radius":34,"color":"#A9785A","label":"束縛與器具","desc":"從繩索、束帶到其他拘束工具的分類入口。","parent":"bd","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L1.svg","shape":"octagon","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_discipline_training","level":2,"radius":34,"color":"#806047","label":"紀律與訓練","desc":"規則建立、日常訓練與角色內行為約定。","parent":"bd","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L3.svg","shape":"octagon","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_power_exchange","level":2,"radius":34,"color":"#6E907D","label":"權力交換","desc":"支配與臣服如何被協議、交接與回應。","parent":"ds","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L1.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_relationship_roles","level":2,"radius":34,"color":"#587460","label":"關係與角色","desc":"角色定位、關係期待與長期互動的整理入口。","parent":"ds","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L3.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_pain_impact","level":2,"radius":34,"color":"#A9794B","label":"痛覺與衝擊","desc":"強度、感受與界線溝通的分類入口。","parent":"sm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L1.svg","shape":"drop","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_sensory_instinct","level":2,"radius":34,"color":"#8A6A49","label":"感官與本能","desc":"感官變化、未知感與本能反應的分類入口。","parent":"sm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L3.svg","shape":"drop","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_safety_communication","level":2,"radius":34,"color":"#547C8B","label":"安全與溝通","desc":"事前協議、事中確認、界線與事後照護。","parent":"community","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L1.svg","shape":"badge","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_culture_exchange","level":2,"radius":34,"color":"#3E6574","label":"文化與交流","desc":"社群互動、次文化、角色切換與經驗分享。","parent":"community","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L3.svg","shape":"badge","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_shibari","level":3,"radius":29,"color":"#B68D70","label":"日式繩縛","desc":"繩索結構、幾何美學與信任關係的主題。","parent":"bd_bondage_tools","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_rules_behavior","level":3,"radius":29,"color":"#96735B","label":"規則與行為訓練","desc":"規則、儀式、回饋與可調整的互動習慣。","parent":"bd_discipline_training","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_power_flow","level":3,"radius":29,"color":"#7FA18C","label":"權力流動","desc":"支配與臣服如何在互動中移動、確認與切換。","parent":"ds_power_exchange","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_ownership_contract","level":3,"radius":29,"color":"#6C8C76","label":"所有權與契約","desc":"稱呼、信物、契約與長期關係的共識。","parent":"ds_relationship_roles","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_impact_strength","level":3,"radius":29,"color":"#B58B59","label":"拍打與強度","desc":"強度分級、感受回饋與安全停止條件。","parent":"sm_pain_impact","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_edge_exploration","level":3,"radius":29,"color":"#9D754D","label":"邊緣探索","desc":"在清楚界線與可退出前提下討論極限感受。","parent":"sm_pain_impact","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_safeword_aftercare","level":3,"radius":29,"color":"#6B96A3","label":"安全詞與事後照護","desc":"安全詞、狀態確認、恢復與事後對話。","parent":"community_safety_communication","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true}
]
    $mindmap$::jsonb
),
(
  'mindmap_data_draft',
  $mindmap$
[
  {"id":"bdsm","level":0,"radius":54,"color":"#D9B650","label":"BDSM","desc":"探索權力交換、身體感受、關係信任與社群文化的入口。","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_bdsm.svg","shape":"plaque","crossLinks":[],"isHotTopicHub":false,"allowContentTag":false},
  {"id":"bd","level":1,"radius":44,"color":"#8F4B3A","label":"BD","desc":"束縛、紀律、器具與行為規範的主題入口。","parent":"bdsm","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L0.svg","shape":"hexagon","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"ds","level":1,"radius":44,"color":"#5B7565","label":"DS","desc":"支配、臣服、權力流動與關係角色的主題入口。","parent":"bdsm","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"sm","level":1,"radius":44,"color":"#A46B3C","label":"SM","desc":"痛覺、衝擊、感官與本能探索的主題入口。","parent":"bdsm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm.svg","shape":"drop","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"community","level":1,"radius":44,"color":"#4D7180","label":"社群","desc":"知情同意、溝通、安全、文化與交流的共同基礎。","parent":"bdsm","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community.svg","shape":"badge","crossLinks":[],"isHotTopicHub":true,"allowContentTag":false},
  {"id":"bd_bondage_tools","level":2,"radius":34,"color":"#A9785A","label":"束縛與器具","desc":"從繩索、束帶到其他拘束工具的分類入口。","parent":"bd","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L1.svg","shape":"octagon","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_discipline_training","level":2,"radius":34,"color":"#806047","label":"紀律與訓練","desc":"規則建立、日常訓練與角色內行為約定。","parent":"bd","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L3.svg","shape":"octagon","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_power_exchange","level":2,"radius":34,"color":"#6E907D","label":"權力交換","desc":"支配與臣服如何被協議、交接與回應。","parent":"ds","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L1.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_relationship_roles","level":2,"radius":34,"color":"#587460","label":"關係與角色","desc":"角色定位、關係期待與長期互動的整理入口。","parent":"ds","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L3.svg","shape":"diamond","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_pain_impact","level":2,"radius":34,"color":"#A9794B","label":"痛覺與衝擊","desc":"強度、感受與界線溝通的分類入口。","parent":"sm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L1.svg","shape":"drop","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_sensory_instinct","level":2,"radius":34,"color":"#8A6A49","label":"感官與本能","desc":"感官變化、未知感與本能反應的分類入口。","parent":"sm","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L3.svg","shape":"drop","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_safety_communication","level":2,"radius":34,"color":"#547C8B","label":"安全與溝通","desc":"事前協議、事中確認、界線與事後照護。","parent":"community","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L1.svg","shape":"badge","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_culture_exchange","level":2,"radius":34,"color":"#3E6574","label":"文化與交流","desc":"社群互動、次文化、角色切換與經驗分享。","parent":"community","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L3.svg","shape":"badge","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_shibari","level":3,"radius":29,"color":"#B68D70","label":"日式繩縛","desc":"繩索結構、幾何美學與信任關係的主題。","parent":"bd_bondage_tools","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"bd_rules_behavior","level":3,"radius":29,"color":"#96735B","label":"規則與行為訓練","desc":"規則、儀式、回饋與可調整的互動習慣。","parent":"bd_discipline_training","image":"/images/bd_art.png","kamonIcon":"/images/totem_bd_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_power_flow","level":3,"radius":29,"color":"#7FA18C","label":"權力流動","desc":"支配與臣服如何在互動中移動、確認與切換。","parent":"ds_power_exchange","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"ds_ownership_contract","level":3,"radius":29,"color":"#6C8C76","label":"所有權與契約","desc":"稱呼、信物、契約與長期關係的共識。","parent":"ds_relationship_roles","image":"/images/ds_art.png","kamonIcon":"/images/totem_ds_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_impact_strength","level":3,"radius":29,"color":"#B58B59","label":"拍打與強度","desc":"強度分級、感受回饋與安全停止條件。","parent":"sm_pain_impact","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"sm_edge_exploration","level":3,"radius":29,"color":"#9D754D","label":"邊緣探索","desc":"在清楚界線與可退出前提下討論極限感受。","parent":"sm_pain_impact","image":"/images/sm_art.png","kamonIcon":"/images/totem_sm_L4.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true},
  {"id":"community_safeword_aftercare","level":3,"radius":29,"color":"#6B96A3","label":"安全詞與事後照護","desc":"安全詞、狀態確認、恢復與事後對話。","parent":"community_safety_communication","image":"/images/bdsm_lobby.png","kamonIcon":"/images/totem_community_L2.svg","shape":"circle","crossLinks":[],"isHotTopicHub":false,"allowContentTag":true}
]
    $mindmap$::jsonb
)
on conflict (key_name) do update set content = excluded.content;

commit;
