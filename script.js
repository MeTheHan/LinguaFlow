let typingTimer;

// Çeviri yap
async function translateText() {
  let text = document.getElementById("inputText").value;
  let from = document.getElementById("fromLang").value;
  let to = document.getElementById("toLang").value;

  if (!text.trim()) {
    document.getElementById("output").innerText = "⚠️ Lütfen bir metin gir!";
    return;
  }

  document.getElementById("output").innerText = "⏳ Çeviriliyor...";

  try {
    let res = await fetch("https://libretranslate.com/translate", {
      method: "POST",
      body: JSON.stringify({
        q: text,
        source: from,
        target: to,
        format: "text"
      }),
      headers: { "Content-Type": "application/json" }
    });

    let data = await res.json();
    document.getElementById("output").innerText = data.translatedText;

    // Geçmişe kaydet
    saveToHistory(text, data.translatedText, to);

  } catch (error) {
    document.getElementById("output").innerText = "❌ Çeviri sırasında hata oluştu.";
    console.error(error);
  }
}

// Sesli okuma
function speakText() {
  let text = document.getElementById("output").innerText;
  if (!text || text.includes("💡") || text.includes("⚠️") || text.includes("⏳") || text.includes("❌")) {
    alert("Sesli okunacak çeviri bulunamadı!");
    return;
  }

  let speech = new SpeechSynthesisUtterance(text);
  speech.lang = document.getElementById("toLang").value;
  window.speechSynthesis.speak(speech);
}

// Geçmişi kaydet
function saveToHistory(input, output, lang) {
  let history = JSON.parse(localStorage.getItem("translationHistory")) || [];
  history.unshift({ input, output, lang });
  localStorage.setItem("translationHistory", JSON.stringify(history));
  renderHistory();
}

// Geçmişi ekrana bas
function renderHistory() {
  let history = JSON.parse(localStorage.getItem("translationHistory")) || [];
  let historyList = document.getElementById("historyList");
  historyList.innerHTML = "";

  history.forEach((item, index) => {
    let li = document.createElement("li");
    li.innerHTML = `"${item.input}" ➝ "${item.output}" [${item.lang}] 
      <button onclick="addToFavorites(${index})">⭐</button>`;
    historyList.appendChild(li);
  });
}

// Geçmişi temizle
function clearHistory() {
  localStorage.removeItem("translationHistory");
  renderHistory();
}

// Favorilere ekle
function addToFavorites(index) {
  let history = JSON.parse(localStorage.getItem("translationHistory")) || [];
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];

  let item = history[index];

  if (!favorites.some(fav => fav.input === item.input && fav.output === item.output)) {
    favorites.unshift(item);
    localStorage.setItem("favorites", JSON.stringify(favorites));
    renderFavorites();
  }
}

// Favorileri ekrana bas
function renderFavorites() {
  let favorites = JSON.parse(localStorage.getItem("favorites")) || [];
  let favoritesList = document.getElementById("favoritesList");
  favoritesList.innerHTML = "";

  favorites.forEach(item => {
    let li = document.createElement("li");
    li.textContent = `"${item.input}" ➝ "${item.output}" [${item.lang}]`;
    favoritesList.appendChild(li);
  });
}

// Favorileri temizle
function clearFavorites() {
  localStorage.removeItem("favorites");
  renderFavorites();
}

// 🌙 Dark Mode toggle
function toggleDarkMode() {
  document.body.classList.toggle("dark-mode");

  if (document.body.classList.contains("dark-mode")) {
    localStorage.setItem("theme", "dark");
    document.querySelector(".dark-mode-toggle").innerText = "☀️ Light Mode";
  } else {
    localStorage.setItem("theme", "light");
    document.querySelector(".dark-mode-toggle").innerText = "🌙 Dark Mode";
  }
}

// Sayfa açıldığında yükle
window.onload = function() {
  renderHistory();
  renderFavorites();

  let savedTheme = localStorage.getItem("theme");
  if (savedTheme === "dark") {
    document.body.classList.add("dark-mode");
    document.querySelector(".dark-mode-toggle").innerText = "☀️ Light Mode";
  }
};

// 🔄 Dilleri Değiştir
function swapLanguages() {
  let fromSelect = document.getElementById("fromLang");
  let toSelect = document.getElementById("toLang");

  if (fromSelect.value === "auto") {
    alert("🌍 Otomatik algılamada değişim yapılamaz!");
    return;
  }

  let temp = fromSelect.value;
  fromSelect.value = toSelect.value;
  toSelect.value = temp;
}

// Anlık çeviri
function autoTranslate() {
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    translateText();
  }, 600);
}

// Klavye kısayolu: Ctrl + Enter → Çevir
document.addEventListener("keydown", function (event) {
  if (event.ctrlKey && event.key === "Enter") {
    translateText();
  }
});

// 📋 Çeviri sonucunu kopyala
function copyTranslation() {
  let text = document.getElementById("output").innerText;

  if (!text || text.includes("💡") || text.includes("⚠️") || text.includes("⏳") || text.includes("❌")) {
    alert("Kopyalanacak geçerli bir çeviri yok!");
    return;
  }

  navigator.clipboard.writeText(text).then(() => {
    alert("✅ Çeviri panoya kopyalandı!");
  }).catch(err => {
    console.error("Kopyalama hatası:", err);
  });
}
