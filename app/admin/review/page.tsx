import fs from 'fs';
import path from 'path';
import Image from 'next/image';
import { graphNodes } from '@/lib/constants';

export default function ImageReviewPage() {
  const imagesDir = path.join(process.cwd(), 'public', 'images', 'nodes');
  
  // Verify which nodes have images
  const nodesStatus = graphNodes.map(node => {
    const kamonExists = fs.existsSync(path.join(imagesDir, `kamon_${node.id}.png`));
    const bannerExists = fs.existsSync(path.join(imagesDir, `realistic_${node.id}.png`));
    return { ...node, kamonExists, bannerExists };
  });

  return (
    <div className="p-8 bg-zinc-950 min-h-screen text-white">
      <h1 className="text-3xl font-bold mb-6 text-zinc-100">節點圖片全覽審查 (Image Review)</h1>
      <p className="mb-8 text-zinc-400">在這裡審查所有自動爬取 (Unsplash) 與算圖 (ComfyUI) 的成果。</p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
        {nodesStatus.map(node => (
          <div key={node.id} className="bg-zinc-900 border border-zinc-800 rounded-lg overflow-hidden flex flex-col">
            {/* Banner Section */}
            <div className="h-40 w-full bg-zinc-800 relative">
              {node.bannerExists ? (
                <Image src={`/images/nodes/realistic_${node.id}.png`} alt="Banner" fill className="object-cover" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-zinc-600">無寫實圖 (需手動補)</div>
              )}
            </div>
            
            {/* Kamon Icon Section (Overlapping) */}
            <div className="relative flex justify-center -mt-10">
              <div className="w-20 h-20 rounded-full border-4 border-zinc-900 bg-white overflow-hidden relative">
                {node.kamonExists ? (
                  <Image src={`/images/nodes/kamon_${node.id}.png`} alt="Kamon" fill className="object-cover" />
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-xs text-zinc-400">運算中...</div>
                )}
              </div>
            </div>
            
            {/* Details */}
            <div className="p-4 text-center">
              <h3 className="font-bold text-lg text-zinc-200">{node.label}</h3>
              <p className="text-xs text-zinc-500 mt-1">ID: {node.id}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
