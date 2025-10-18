import React, { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Area, ComposedChart, ReferenceLine } from 'recharts';

export default function EconomicsSimulator() {
  const [supplyFactor, setSupplyFactor] = useState(1);
  const [demandFactor, setDemandFactor] = useState(1);
  const [intervention, setIntervention] = useState('none');
  const [interventionValue, setInterventionValue] = useState(50);

  // Denge hesaplama
  const calcEquilibrium = (sf, df) => {
    // Arz: P = 10 + 2Q/sf
    // Talep: P = 100 - 2Q/df
    // Denge: 10 + 2Q/sf = 100 - 2Q/df
    const qEq = (90 * sf * df) / (2 * df + 2 * sf);
    const pEq = 10 + (2 * qEq) / sf;
    return { q: qEq, p: pEq };
  };

  const eq = calcEquilibrium(supplyFactor, demandFactor);

  // Arz ve talep verisi oluştur
  const generateData = () => {
    const data = [];
    for (let q = 0; q <= 50; q += 0.5) {
      const supply = 10 + (2 * q) / supplyFactor;
      const demand = 100 - (2 * q) / demandFactor;
      data.push({ q, supply, demand });
    }
    return data;
  };

  const chartData = generateData();

  // Müdahaleye göre gerçek miktar ve fiyat hesapla
  let actualQ = eq.q;
  let actualP = eq.p;
  let dwl = 0;
  let consumerSurplus = 0;
  let producerSurplus = 0;

  const demandAtQ = (q) => 100 - (2 * q) / demandFactor;
  const supplyAtQ = (q) => 10 + (2 * q) / supplyFactor;
  const qAtDemand = (p) => ((100 - p) * demandFactor) / 2;
  const qAtSupply = (p) => ((p - 10) * supplyFactor) / 2;

  if (intervention === 'ceiling' && interventionValue < eq.p) {
    actualP = interventionValue;
    actualQ = Math.min(qAtSupply(actualP), qAtDemand(actualP));
    const qDemand = qAtDemand(actualP);
    const qSupply = qAtSupply(actualP);
    actualQ = qSupply; // Arz edilen miktar piyasayı sınırlar
    
    consumerSurplus = 0.5 * actualQ * (demandAtQ(0) - actualP);
    producerSurplus = 0.5 * actualQ * (actualP - supplyAtQ(0));
    dwl = 0.5 * (eq.q - actualQ) * (demandAtQ(actualQ) - supplyAtQ(actualQ));
  } else if (intervention === 'floor' && interventionValue > eq.p) {
    actualP = interventionValue;
    const qDemand = qAtDemand(actualP);
    const qSupply = qAtSupply(actualP);
    actualQ = qDemand; // Talep edilen miktar piyasayı sınırlar
    
    consumerSurplus = 0.5 * actualQ * (demandAtQ(0) - actualP);
    producerSurplus = 0.5 * actualQ * (actualP - supplyAtQ(0));
    dwl = 0.5 * (eq.q - actualQ) * (supplyAtQ(actualQ) - demandAtQ(actualQ));
  } else if (intervention === 'tax') {
    const tax = interventionValue;
    // Vergi ile yeni denge: talep = arz + vergi
    // 100 - 2Q/df = 10 + 2Q/sf + vergi
    actualQ = ((90 - tax) * supplyFactor * demandFactor) / (2 * demandFactor + 2 * supplyFactor);
    const pBuyer = demandAtQ(actualQ);
    const pSeller = supplyAtQ(actualQ);
    actualP = pBuyer;
    
    consumerSurplus = 0.5 * actualQ * (demandAtQ(0) - pBuyer);
    producerSurplus = 0.5 * actualQ * (pSeller - supplyAtQ(0));
    dwl = 0.5 * (eq.q - actualQ) * tax;
  } else {
    consumerSurplus = 0.5 * eq.q * (demandAtQ(0) - eq.p);
    producerSurplus = 0.5 * eq.q * (eq.p - supplyAtQ(0));
  }

  // Fazlalık alanları için doldurma verisi oluştur
  const generateSurplusData = () => {
    const data = [];
    const step = 0.5;
    
    if (intervention === 'tax') {
      const pBuyer = demandAtQ(actualQ);
      const pSeller = supplyAtQ(actualQ);
      
      for (let q = 0; q <= actualQ; q += step) {
        data.push({
          q,
          cs: demandAtQ(q),
          csBase: pBuyer,
          ps: pSeller,
          psBase: supplyAtQ(q),
          dwlTop: q >= actualQ - step ? demandAtQ(q) : null,
          dwlBottom: q >= actualQ - step ? supplyAtQ(q) : null
        });
      }
      
      // Ölü ağırlık kaybı üçgeni ekle
      for (let q = actualQ; q <= eq.q; q += step) {
        data.push({
          q,
          dwlTop: demandAtQ(q),
          dwlBottom: supplyAtQ(q)
        });
      }
    } else {
      for (let q = 0; q <= actualQ; q += step) {
        data.push({
          q,
          cs: demandAtQ(q),
          csBase: actualP,
          ps: actualP,
          psBase: supplyAtQ(q)
        });
      }
      
      if (dwl > 0) {
        for (let q = actualQ; q <= eq.q; q += step) {
          data.push({
            q,
            dwlTop: intervention === 'ceiling' ? demandAtQ(q) : supplyAtQ(q),
            dwlBottom: intervention === 'ceiling' ? supplyAtQ(q) : demandAtQ(q)
          });
        }
      }
    }
    
    return data;
  };

  const surplusData = generateSurplusData();

  return (
    <div className="p-6 max-w-6xl mx-auto bg-gray-50">
      <h1 className="text-3xl font-bold mb-6 text-gray-800">Devlet Müdahalesi Ekonomi Simülatörü</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-6">
        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Arz Eğrisi</h2>
          <label className="block text-sm font-medium mb-2 text-gray-600">
            Arz Seviyesi: {supplyFactor.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={supplyFactor}
            onChange={(e) => setSupplyFactor(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-2">
            Yüksek = Daha fazla arz (eğri sağa kayar, fiyat düşer)
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Talep Eğrisi</h2>
          <label className="block text-sm font-medium mb-2 text-gray-600">
            Talep Seviyesi: {demandFactor.toFixed(2)}x
          </label>
          <input
            type="range"
            min="0.5"
            max="2"
            step="0.1"
            value={demandFactor}
            onChange={(e) => setDemandFactor(parseFloat(e.target.value))}
            className="w-full"
          />
          <p className="text-xs text-gray-500 mt-2">
            Yüksek = Daha fazla talep (eğri sağa kayar, fiyat yükselir)
          </p>
        </div>

        <div className="bg-white p-6 rounded-lg shadow">
          <h2 className="text-xl font-semibold mb-4 text-gray-700">Devlet Müdahalesi</h2>
          <select
            value={intervention}
            onChange={(e) => setIntervention(e.target.value)}
            className="w-full p-2 border rounded mb-3"
          >
            <option value="none">Müdahale Yok</option>
            <option value="ceiling">Tavan Fiyat</option>
            <option value="floor">Taban Fiyat</option>
            <option value="tax">Vergi</option>
          </select>
          
          {intervention !== 'none' && (
            <>
              <label className="block text-sm font-medium mb-2 text-gray-600">
                {intervention === 'tax' ? 'Vergi Miktarı' : 'Fiyat'}: ₺{interventionValue}
              </label>
              <input
                type="range"
                min="10"
                max="90"
                step="5"
                value={interventionValue}
                onChange={(e) => setInterventionValue(parseInt(e.target.value))}
                className="w-full"
              />
            </>
          )}
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg shadow mb-6">
        <h2 className="text-xl font-semibold mb-4 text-gray-700">Piyasa Grafiği</h2>
        <ComposedChart width={800} height={500} data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 20 }}>
          <CartesianGrid strokeDasharray="3 3" />
          <XAxis dataKey="q" label={{ value: 'Miktar', position: 'bottom' }} />
          <YAxis label={{ value: 'Fiyat (₺)', angle: -90, position: 'left' }} domain={[0, 110]} />
          
          {/* Tüketici Fazlası */}
          <Area
            data={surplusData}
            dataKey="cs"
            stroke="none"
            fill="#3b82f6"
            fillOpacity={0.3}
            baseValue="csBase"
          />
          
          {/* Üretici Fazlası */}
          <Area
            data={surplusData}
            dataKey="ps"
            stroke="none"
            fill="#10b981"
            fillOpacity={0.3}
            baseValue="psBase"
          />
          
          {/* Ölü Ağırlık Kaybı */}
          {dwl > 0 && (
            <Area
              data={surplusData}
              dataKey="dwlTop"
              stroke="none"
              fill="#ef4444"
              fillOpacity={0.4}
              baseValue="dwlBottom"
            />
          )}
          
          <Line type="monotone" dataKey="supply" stroke="#10b981" strokeWidth={3} dot={false} name="Arz" />
          <Line type="monotone" dataKey="demand" stroke="#3b82f6" strokeWidth={3} dot={false} name="Talep" />
          
          {intervention === 'ceiling' && interventionValue < eq.p && (
            <ReferenceLine y={interventionValue} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label="Tavan" />
          )}
          {intervention === 'floor' && interventionValue > eq.p && (
            <ReferenceLine y={interventionValue} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label="Taban" />
          )}
          {intervention === 'tax' && (
            <>
              <ReferenceLine y={demandAtQ(actualQ)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label="Alıcı Fiyatı" />
              <ReferenceLine y={supplyAtQ(actualQ)} stroke="#ef4444" strokeWidth={2} strokeDasharray="5 5" label="Satıcı Fiyatı" />
            </>
          )}
        </ComposedChart>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-blue-50 p-4 rounded-lg border-2 border-blue-300">
          <h3 className="font-semibold text-blue-800 mb-2">Denge Fiyatı</h3>
          <p className="text-2xl font-bold text-blue-900">₺{actualP.toFixed(2)}</p>
          {intervention !== 'none' && intervention !== 'tax' && (
            <p className="text-sm text-blue-600 mt-1">Serbest piyasa: ₺{eq.p.toFixed(2)}</p>
          )}
        </div>

        <div className="bg-green-50 p-4 rounded-lg border-2 border-green-300">
          <h3 className="font-semibold text-green-800 mb-2">Denge Miktarı</h3>
          <p className="text-2xl font-bold text-green-900">{actualQ.toFixed(2)}</p>
          {intervention !== 'none' && (
            <p className="text-sm text-green-600 mt-1">Serbest piyasa: {eq.q.toFixed(2)}</p>
          )}
        </div>

        <div className="bg-blue-100 p-4 rounded-lg border-2 border-blue-400">
          <h3 className="font-semibold text-blue-800 mb-2">Tüketici Fazlası</h3>
          <p className="text-2xl font-bold text-blue-900">₺{consumerSurplus.toFixed(2)}</p>
          <p className="text-xs text-blue-600 mt-1">Grafikteki mavi alan</p>
        </div>

        <div className="bg-green-100 p-4 rounded-lg border-2 border-green-400">
          <h3 className="font-semibold text-green-800 mb-2">Üretici Fazlası</h3>
          <p className="text-2xl font-bold text-green-900">₺{producerSurplus.toFixed(2)}</p>
          <p className="text-xs text-green-600 mt-1">Grafikteki yeşil alan</p>
        </div>

        {dwl > 0 && (
          <div className="bg-red-50 p-4 rounded-lg border-2 border-red-300 md:col-span-2">
            <h3 className="font-semibold text-red-800 mb-2">Ölü Ağırlık Kaybı</h3>
            <p className="text-2xl font-bold text-red-900">₺{dwl.toFixed(2)}</p>
            <p className="text-xs text-red-600 mt-1">Kırmızı alan müdahaleden kaynaklanan ekonomik verimsizliği gösterir</p>
          </div>
        )}
      </div>

      <div className="mt-6 bg-white p-6 rounded-lg shadow">
        <h3 className="font-semibold text-gray-800 mb-3">Nasıl Çalışır:</h3>
        <ul className="space-y-2 text-sm text-gray-700">
          <li><strong>Arz Artışı:</strong> Arz eğrisini sağa kaydırır → Fiyat düşer → Üretici fazlası azalır, Tüketici fazlası artar</li>
          <li><strong>Talep Artışı:</strong> Talep eğrisini sağa kaydırır → Fiyat yükselir → Üretici fazlası artar, Tüketici fazlası azalır</li>
          <li><strong>Tavan Fiyat:</strong> Dengenin altında maksimum yasal fiyat → Kıtlık → Ölü ağırlık kaybı (kırmızı alan)</li>
          <li><strong>Taban Fiyat:</strong> Dengenin üstünde minimum yasal fiyat → Arz fazlası → Ölü ağırlık kaybı (kırmızı alan)</li>
          <li><strong>Vergi:</strong> Alıcı ve satıcı fiyatı arasında fark → Azalan miktar → Ölü ağırlık kaybı (kırmızı alan)</li>
        </ul>
      </div>
    </div>
  );
}