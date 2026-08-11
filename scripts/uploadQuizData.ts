import { createClient } from '@supabase/supabase-js';
import { AXES_INFO, TRAITS_DB, ENDINGS_DB, SCENARIO_GRAPH, CARDS } from '../lib/quizData';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing Supabase credentials in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function upload() {
  const payload = {
    axes: AXES_INFO,
    traits: TRAITS_DB,
    endings: ENDINGS_DB,
    scenarioGraph: SCENARIO_GRAPH,
    cards: CARDS
  };

  console.log("Uploading quiz_system_config...");
  
  // Use upsert or select/update. Let's try upsert assuming key_name is unique/PK.
  const { data, error } = await supabase
    .from('quiz_content')
    .upsert({
      key_name: 'quiz_system_config',
      content: payload
    }, { onConflict: 'key_name' });

  if (error) {
    console.error("Failed to upload via upsert:", error.message);
    
    // Fallback: try update if upsert fails due to missing PK config
    console.log("Trying explicit update...");
    const { error: updateError } = await supabase
      .from('quiz_content')
      .update({ content: payload })
      .eq('key_name', 'quiz_system_config');
      
    if (updateError) {
      console.error("Update also failed:", updateError.message);
      
      console.log("Trying insert...");
      const { error: insertError } = await supabase
        .from('quiz_content')
        .insert({ key_name: 'quiz_system_config', content: payload });
        
      if (insertError) {
        console.error("Insert failed:", insertError.message);
      } else {
        console.log("Successfully inserted!");
      }
    } else {
      console.log("Successfully updated!");
    }
  } else {
    console.log("Successfully upserted!");
  }
}

upload();
