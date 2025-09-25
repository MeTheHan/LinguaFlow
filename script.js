/* LinguaFlow - tamamen baştan yazılmış, mobil uyumlu ve stabil.
   - MyMemory API (ücretsiz) kullanılıyor.
   - Hata kontrolleri, fallback ve kullanıcı geri bildirimleri eklendi.
   - Sadece bu üç dosyayı projenize koymanız yeterli.
*/

const $ = id => document.getElementById(id);

let typingTimer = null;
const DEBOUNCE_MS = 600;

// küçük yardımcılar
function showMessage(msg){
  const out = $('output');
  out.textContent = msg;
}

function speechLangFor(code){
  // speechSynthesis bazen bölgesel kod ister
  const map = {
    'en':'en-US','tr':'tr-TR','pt':'pt-PT','zh-CN':'zh-CN','zh-TW':'zh-TW',
    'ru':'ru-RU','es':'es-ES','de':'de-DE','fr':'fr-FR','ja':'ja-JP','hi':'hi-IN',
    'ar':'ar-SA','bn':'bn-BD','pa':'pa-IN','ur':'ur-PK','id':'id-ID','sw':'sw-KE'
  };
  return map[code]||code;
}

// çeviri fonksiyonu (MyMemory) - robust
async function translateText(){
  const input = $('inputText').value.trim();
  let from = $('fromLang').value;
  let to = $('toLang').value;

  if(!input){
    showMessage('⚠️ Lütfen bir metin girin!');
    return;
  }

  // MyMemory auto desteklemez; fallback kullan
  if(from === 'auto') from = 'en';

  showMessage('⏳ Çeviriliyor...');

  try{
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(input)}&langpair=${from}|${to}`;
    const res = await fetch(url);
    const data = await res.json();
    console.log('MYMEM:', data);

    // öncelikle responseData.translatedText, yoksa matches[0].translation
    let translated = null;
    if(data && data.responseData && data.responseData.translatedText) translated = data.responseData.translatedText;
    else if(data && data.matches && data.matches.length && data.matches[0].translation) translated = data.matches[0].translation;

    if(!translated){
      showMessage('❌ Çeviri alınamadı (API boş cevap verdi).');
      return;
    }

    $('output').textContent = translated;
    saveToHistory(input, translated, to);
  }catch(err){
    console.error('translate error', err);
    showMessage('❌ Çeviri sırasında hata oluştu.');
  }
}

// sesli okuma
function speakText(){
  const text = $('output').textContent || '';
  if(!text || text.includes('⚠️') || text.includes('❌') || text.includes('💡')){
    alert('Sesli okunacak çeviri bulunamadı!');
    return;
  }
  const code = speechLangFor($('toLang').value);
  const ut = new SpeechSynthesisUtterance(text);
  ut.lang = code;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(ut);
}

// kopyala
function copyTranslation(){
  const text = $('output').textContent || '';
  if(!text || text.includes('⚠️') || text.includes('❌') || text.includes('💡')){
    alert('Kopyalanacak geçerli bir çeviri yok!');
    return;
  }
  navigator.clipboard.writeText(text).then(()=>{
    // küçük bir görsel bildirim yerine alert kolay ve güvenli
    alert('✅ Çeviri panoya kopyalandı!');
  }).catch(err=>{
    console.error('copy err', err);
    alert('Kopyalama başarısız.');
  });
}

// geçmiş / favoriler
function saveToHistory(input, output, lang){
  try{
    const h = JSON.parse(localStorage.getItem('translationHistory')||'[]');
    h.unshift({input,output,lang,at:new Date().toISOString()});
    localStorage.setItem('translationHistory', JSON.stringify(h.slice(0,200)));
    renderHistory();
  }catch(e){ console.error(e); }
}

function renderHistory(){
  const list = JSON.parse(localStorage.getItem('translationHistory')||'[]');
  const el = $('historyList');
  el.innerHTML = '';
  list.forEach((it, idx)=>{
    const li = document.createElement('li');
    li.innerHTML = `<div class="hi"><strong>${escapeHtml(it.input)}</strong><div class="muted">${it.at.split('T')[0]}</div><div>➝ ${escapeHtml(it.output)}</div></div><div><button onclick="addToFavorites(${idx})">⭐</button></div>`;
    el.appendChild(li);
  });
}

function clearHistory(){
  localStorage.removeItem('translationHistory');
  renderHistory();
}

function addToFavorites(idx){
  const hist = JSON.parse(localStorage.getItem('translationHistory')||'[]');
  const item = hist[idx];
  if(!item) return;
  const favs = JSON.parse(localStorage.getItem('favorites')||'[]');
  if(!favs.some(f=> f.input===item.input && f.output===item.output)){
    favs.unshift(item);
    localStorage.setItem('favorites', JSON.stringify(favs.slice(0,200)));
    renderFavorites();
  }
}

function renderFavorites(){
  const favs = JSON.parse(localStorage.getItem('favorites')||'[]');
  const el = $('favoritesList');
  el.innerHTML = '';
  favs.forEach(it=>{
    const li = document.createElement('li');
    li.innerHTML = `<div class="hi"><strong>${escapeHtml(it.input)}</strong><div class="muted">${it.at?it.at.split('T')[0]:''}</div><div>➝ ${escapeHtml(it.output)}</div></div>`;
    el.appendChild(li);
  });
}

function clearFavorites(){
  localStorage.removeItem('favorites');
  renderFavorites();
}

function escapeHtml(s){ return String(s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;'); }

// swap
function swapLanguages(){
  const from = $('fromLang');
  const to = $('toLang');
  if(from.value === 'auto'){ alert('🌍 Otomatik algılamada değişim yapılamaz!'); return; }
  const tmp = from.value; from.value = to.value; to.value = tmp;
}

// auto translate debounce
function autoTranslate(){ clearTimeout(typingTimer); typingTimer = setTimeout(()=> translateText(), DEBOUNCE_MS); }

// dark mode toggle robust
function toggleDarkMode(){
  document.body.classList.toggle('dark-mode');
  const on = document.body.classList.contains('dark-mode');
  try{ localStorage.setItem('theme', on ? 'dark' : 'light'); }catch(e){}
  const btn = $('darkToggle'); if(btn) btn.textContent = on ? '☀️' : '🌙';
}

// init app
function initApp(){
  const translateBtn = $('translateBtn'); if(translateBtn) translateBtn.addEventListener('click', translateText);
  const speakBtn = $('speakBtn'); if(speakBtn) speakBtn.addEventListener('click', speakText);
  const copyBtn = $('copyBtn'); if(copyBtn) copyBtn.addEventListener('click', copyTranslation);
  const swapBtn = $('swapBtn'); if(swapBtn) swapBtn.addEventListener('click', swapLanguages);
  const input = $('inputText'); if(input) input.addEventListener('input', autoTranslate);
  const clearHist = $('clearHistoryBtn'); if(clearHist) clearHist.addEventListener('click', clearHistory);
  const clearFav = $('clearFavBtn'); if(clearFav) clearFav.addEventListener('click', clearFavorites);
  const darkBtn = $('darkToggle'); if(darkBtn) darkBtn.addEventListener('click', toggleDarkMode);
  const yt = $('youtubeBtn'); if(yt) yt.addEventListener('click', ()=> window.open('https://www.youtube.com/@MTechnow','_blank'));

  // restore theme
  const saved = localStorage.getItem('theme'); if(saved === 'dark') document.body.classList.add('dark-mode');

  // render
  renderHistory(); renderFavorites();
}

// DOM ready
document.addEventListener('DOMContentLoaded', initApp);
