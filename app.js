// DOM Elements
const output = document.getElementById('output');
const textInput = document.getElementById('textInput');
const statusElement = document.getElementById('status');
const commandHistory = document.getElementById('commandHistory');
const micButton = document.getElementById('micButton');
const stopButton = document.getElementById('stopButton');

// Speech Recognition Setup
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
const recognition = new SpeechRecognition();
recognition.lang = 'en-US';
recognition.interimResults = false;
recognition.continuous = false;

// App State
let currentLanguage = "en"; // en, hi, bn
let availableVoices = [];
let conversationHistory = [];
let isListening = false;

// Initialize the app
window.onload = () => {
  // Cache voices once on voiceschanged event
  speechSynthesis.onvoiceschanged = () => {
    if (availableVoices.length === 0) {
      availableVoices = speechSynthesis.getVoices();
    }
  };
  // Cache voices immediately if available
  if (availableVoices.length === 0) {
    availableVoices = speechSynthesis.getVoices();
  }
  loadHistory();
  greetUser();
  textInput.addEventListener('focus', () => {
    document.body.classList.add('typing');
  });
  textInput.addEventListener('blur', () => {
    document.body.classList.remove('typing');
  });
};

// Voice Recognition Functions
function startListening() {
  if (isListening) return;
  isListening = true;
  micButton.disabled = true;
  stopButton.disabled = false;
  statusElement.textContent = "Listening...";
  output.textContent = "Listening...";
  document.body.classList.add('listening');
  recognition.start();
}
// Debounce startListening to prevent rapid multiple calls
let startListeningTimeout = null;
function debouncedStartListening() {
  if (startListeningTimeout) {
    clearTimeout(startListeningTimeout);
  }
  startListeningTimeout = setTimeout(() => {
    startListening();
    startListeningTimeout = null;
  }, 200);
}

function stopListening() {
  if (!isListening) return;
  isListening = false;
  recognition.stop();
  micButton.disabled = false;
  stopButton.disabled = true;
  statusElement.textContent = "Ready";
  document.body.classList.remove('listening');
}

recognition.onresult = (event) => {
  const transcript = event.results[0][0].transcript;
  addToHistory(transcript);
  outputTextWithTypingEffect("You said: " + transcript);
  respond(transcript);
  stopListening();
};

recognition.onerror = (event) => {
  output.textContent = "Error occurred: " + event.error;
  stopListening();
};

recognition.onend = () => {
  // Only restart recognition if still listening and not already started
  if (isListening && !recognitionStarted) {
    recognitionStarted = true;
    recognition.start();
  }
};
let recognitionStarted = false;
recognition.onstart = () => {
  recognitionStarted = true;
};
recognition.onstop = () => {
  recognitionStarted = false;
};

// Text Input Functions
function sendText() {
  const input = textInput.value.trim();
  if (input) {
    addToHistory(input);
    outputTextWithTypingEffect("You typed: " + input);
    respond(input);
    textInput.value = "";
  }
}

function handleKeyPress(event) {
  if (event.key === 'Enter') {
    sendText();
  }
}

// Conversation Functions
function greetUser() {
  const hour = new Date().getHours();
  let greeting = "Hello! I'm Golu, your assistant. How can I help you today?";
  if (hour >= 5 && hour < 12) greeting = "Good morning! I'm Golu, your assistant. What can I do for you today?";
  else if (hour >= 12 && hour < 17) greeting = "Good afternoon! I'm Golu, your assistant. How can I assist you?";
  else if (hour >= 17 && hour < 21) greeting = "Good evening! I'm Golu, your assistant. What do you need help with?";
  else greeting = "Hello night owl! I'm Golu, your assistant. What brings you here so late?";
  outputTextWithTypingEffect(greeting);
  speak(greeting);
}

function respond(message) {
  let response = getResponseForMessage(message.toLowerCase());
  if (response) {
    if (response.action) response.action();
    if (response.text) {
      outputTextWithTypingEffect(response.text);
      speak(response.text);
    }
    return;
  }
  const defaultResponse = currentLanguage === "hi" ? 
    "माफ कीजिए, मैं समझ नहीं पाया। क्या आप दोबारा कह सकते हैं?" :
    currentLanguage === "bn" ? 
    "দুঃখিত, আমি বুঝতে পারিনি। আপনি আবার বলতে পারেন?" :
    "Sorry, I didn't understand that. Could you try again?";
  outputTextWithTypingEffect(defaultResponse);
  speak(defaultResponse);
}

function getResponseForMessage(message) {
  const websites = {
    "youtube": {url: "https://www.youtube.com", name: "YouTube"},
    "facebook": {url: "https://www.facebook.com", name: "Facebook"},
    "instagram": {url: "https://www.instagram.com", name: "Instagram"},
    "whatsapp": {url: "https://web.whatsapp.com", name: "WhatsApp"},
    "gmail": {url: "https://mail.google.com", name: "Gmail"},
    "google": {url: "https://www.google.com", name: "Google"},
    "twitter": {url: "https://twitter.com", name: "Twitter"},
    "netflix": {url: "https://www.netflix.com", name: "Netflix"},
    "amazon": {url: "https://www.amazon.com", name: "Amazon"},
    "wikipedia": {url: "https://www.wikipedia.org", name: "Wikipedia"}
  };
  for (let site in websites) {
    if (message.includes("open " + site)) {
      const siteInfo = websites[site];
      return {
        text: currentLanguage === "hi" ? `${siteInfo.name} खोल रहा हूँ...` :
              currentLanguage === "bn" ? `${siteInfo.name} খুলছি...` :
              `Opening ${siteInfo.name}...`,
        action: () => window.open(siteInfo.url, "_blank")
      };
    }
  }
  if (message.startsWith("who is") || message.startsWith("what is") || 
      message.startsWith("tell me about")) {
    const topic = message.replace("who is", "")
                        .replace("what is", "")
                        .replace("tell me about", "")
                        .trim();
    return {
      text: currentLanguage === "hi" ? `मैं ${topic} के बारे में जानकारी ढूंढ रहा हूँ...` :
            currentLanguage === "bn" ? `আমি ${topic} সম্পর্কে তথ্য খুঁজছি...` :
            `Looking up information about ${topic}...`,
      action: () => fetchWikipedia(topic)
    };
  }
  if (message.includes("search") || message.includes("google")) {
    let query = message.replace("search", "")
                       .replace("in google", "")
                       .replace("google", "")
                       .trim();
    if (query) {
      return {
        text: currentLanguage === "hi" ? `"${query}" को Google पर खोज रहा हूँ...` :
              currentLanguage === "bn" ? `"${query}" গুগলে খুঁজছি...` :
              `Searching for "${query}" on Google...`,
        action: () => window.open(`https://www.google.com/search?q=${encodeURIComponent(query)}`, "_blank")
      };
    }
  }
  if (message.includes("play")) {
    const query = message.replace("play", "")
                         .replace("song", "")
                         .replace("music", "")
                         .replace("video", "")
                         .trim();
    if (query) {
      return {
        text: currentLanguage === "hi" ? `"${query}" चला रहा हूँ YouTube पर...` :
              currentLanguage === "bn" ? `"${query}" ইউটিউবে চালাচ্ছি...` :
              `Playing "${query}" on YouTube...`,
        action: () => window.open(`https://www.youtube.com/results?search_query=${encodeURIComponent(query)}`, "_blank")
      };
    }
  }
  if (message.includes("speak in bengali") || message.includes("speak bengali") || 
      message.includes("বাংলা")) {
    currentLanguage = "bn";
    return {
      text: "ভাষা বাংলা করা হয়েছে। এখন আমি বাংলায় কথা বলব।",
      action: () => speak("ভাষা বাংলা করা হয়েছে। এখন আমি বাংলায় কথা বলব।")
    };
  }
  if (message.includes("speak in hindi") || message.includes("speak hindi") || 
      message.includes("हिंदी")) {
    currentLanguage = "hi";
    return {
      text: "अब मैं हिंदी में बोलूंगा।",
      action: () => speak("अब मैं हिंदी में बोलूंगा।")
    };
  }
  if (message.includes("speak in english") || message.includes("speak english")) {
    currentLanguage = "en";
    return {
      text: "Language changed to English.",
      action: () => speak("Language changed to English.")
    };
  }
  if (/(\d+|\w+)\s?(plus|minus|times|multiplied by|divided by|over)\s?(\d+|\w+)/.test(message)) {
    const result = solveMath(message);
    if (result !== null) {
      return {
        text: currentLanguage === "bn" ? `উত্তর হল ${result}।` :
              currentLanguage === "hi" ? `उत्तर है ${result}।` :
              `The answer is ${result}.`
      };
    } else {
      return {
        text: currentLanguage === "bn" ? "এই অঙ্কটা একটু কঠিন। আবার বলো।" :
              currentLanguage === "hi" ? "यह गणित थोड़ा कठिन है। कृपया फिर से पूछें।" :
              "Hmm, that math looks tricky. Can you try again?"
      };
    }
  }
  if (message.includes("time") || message.includes("date") || message.includes("today")) {
    const now = new Date();
    const time = now.toLocaleTimeString();
    const date = now.toLocaleDateString();
    return {
      text: currentLanguage === "hi" ? `आज की तारीख ${date} है और समय ${time} है।` :
            currentLanguage === "bn" ? `আজকের তারিখ ${date} এবং সময় ${time}।` :
            `Today is ${date}, and the current time is ${time}.`
    };
  }
  if (message.includes("hello") || message.includes("hi") || message.includes("hey")) {
    return {
      text: currentLanguage === "hi" ? "हैलो! मैं गोलू हूँ। आपकी क्या मदद कर सकता हूँ?" :
            currentLanguage === "bn" ? "হ্যালো! আমি গোলু। আমি আপনাকে কিভাবে সাহায্য করতে পারি?" :
            "Hello! I'm Golu. How can I help you today?"
    };
  }
  if (message.includes("who are you") || message.includes("your name") || 
      message.includes("introduce yourself") || message.includes("about you")) {
    return {
      text: currentLanguage === "hi" ? "मेरा नाम गोलू है। मैं आपकी मदद के लिए यहाँ हूँ!" :
            currentLanguage === "bn" ? "আমার নাম গোলু। আমি তোমার সাহায্য করতে এখানে আছি!" :
            "My name is Golu. I'm here to help you with anything you need!"
    };
  }
  if (message.includes("good night") || message.includes("bye") || message.includes("goodbye")) {
    return {
      text: currentLanguage === "hi" ? "अलविदा! अपना ख्याल रखना!" :
            currentLanguage === "bn" ? "বিদায়! ভালো থেকো!" :
            "Goodbye! Have a wonderful day!",
      action: () => {
        speak(currentLanguage === "hi" ? "अलविदा! अपना ख्याल रखना!" :
              currentLanguage === "bn" ? "বিদায়! ভালো থেকো!" :
              "Goodbye! Have a wonderful day!");
        recognition.stop();
      }
    };
  }
  if (message.includes("say hello to")) {
    let name = "";
    if (message.includes("say hello to my friend")) {
      name = message.split("say hello to my friend")[1]?.trim();
    } else if (message.includes("say hello to mr")) {
      name = "Mr. " + message.split("say hello to mr")[1]?.trim();
    } else if (message.includes("say hello to ms")) {
      name = "Ms. " + message.split("say hello to ms")[1]?.trim();
    } else if (message.includes("say hello to mrs")) {
      name = "Mrs. " + message.split("say hello to mrs")[1]?.trim();
    } else {
      name = message.split("say hello to")[1]?.trim();
    }
    if (!name && (message.includes("all my friends") || message.includes("everyone"))) {
      return {
        text: currentLanguage === "hi" ? "नमस्ते दोस्तों! 😊" :
              currentLanguage === "bn" ? "হ্যালো বন্ধুরা! 😊" :
              "Hello everyone! 👋"
      };
    }
    if (name) {
      return {
        text: currentLanguage === "hi" ? `नमस्ते ${name} जी! 😊` :
              currentLanguage === "bn" ? `হ্যালো ${name}! 😊` :
              `Hello ${name}! 👋`
      };
    }
  }
  return null;
}

function fetchWikipedia(topic) {
  const url = `https://en.wikipedia.org/wiki/${encodeURIComponent(topic)}`;
  fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(topic)}`)
    .then(res => res.json())
    .then(data => {
      if (data.extract) {
        const maxLength = 400;
        const shortText = data.extract.length > maxLength
          ? data.extract.substring(0, maxLength) + "..."
          : data.extract;
        const response = `${shortText}\n\n👉 <a href="${url}" target="_blank">Click here to read more</a>`;
        output.innerHTML = response.replace(/\n/g, "<br>");
        speak(shortText);
      } else {
        const response = currentLanguage === "hi" ? 
          "माफ कीजिए, मैं इस विषय पर जानकारी नहीं ढूंढ पाया।" :
          currentLanguage === "bn" ? 
          "দুঃখিত, আমি এই বিষয়ে তথ্য খুঁজে পাইনি।" :
          "Sorry, I couldn't find information about that.";
        outputTextWithTypingEffect(response);
        speak(response);
      }
    })
    .catch(() => {
      const response = currentLanguage === "hi" ? 
        "जानकारी प्राप्त करते समय कोई समस्या आई।" :
        currentLanguage === "bn" ? 
        "তথ্য পাওয়ার সময় একটি সমস্যা হয়েছে।" :
        "Something went wrong while fetching the information.";
      outputTextWithTypingEffect(response);
      speak(response);
    });
}

function solveMath(message) {
  message = message.replace("what is", "")
                  .replace("calculate", "")
                  .replace("solve", "")
                  .trim();
  const numberWords = {
    "plus": "+", "add": "+", "and": "+", "sum": "+",
    "minus": "-", "subtract": "-", "remove": "-",
    "times": "*", "multiplied by": "*", "multiply": "*", "product": "*",
    "divided by": "/", "over": "/", "divide": "/", "quotient": "/",
    "one": 1, "two": 2, "three": 3, "four": 4, "five": 5,
    "six": 6, "seven": 7, "eight": 8, "nine": 9, "zero": 0,
    "ten": 10, "twenty": 20, "thirty": 30, "forty": 40, "fifty": 50,
    "sixty": 60, "seventy": 70, "eighty": 80, "ninety": 90,
    "hundred": 100, "thousand": 1000
  };
  Object.keys(numberWords).forEach(word => {
    const regex = new RegExp("\\b" + word + "\\b", "gi");
    message = message.replace(regex, numberWords[word]);
  });
  try {
    if (/^[\d+\-*/. ]+$/.test(message)) {
      return eval(message);
    }
    return null;
  } catch {
    return null;
  }
}

// UI Functions
function outputTextWithTypingEffect(text) {
  output.textContent = "";
  let i = 0;
  document.body.classList.add('typing');
  // Use requestAnimationFrame for smoother animation
  function type() {
    if (i < text.length) {
      output.textContent += text.charAt(i);
      i++;
      requestAnimationFrame(type);
    } else {
      document.body.classList.remove('typing');
    }
  }
  requestAnimationFrame(type);
}

// Speech Functions
function speak(text) {
  const synth = window.speechSynthesis;
  // Only cancel if currently speaking and the new text is different to avoid interrupting ongoing speech unnecessarily
  if (synth.speaking) {
    if (synth.pending || synth.speaking) {
      synth.cancel();
    }
  }
  const utter = new SpeechSynthesisUtterance(text.replace(/[\u{1F600}-\u{1F6FF}]/gu, ""));
  if (currentLanguage === "hi") {
    utter.lang = "hi-IN";
    utter.rate = 1.0;
  } else if (currentLanguage === "bn") {
    utter.lang = "bn-IN";
    utter.rate = 1.0;
  } else {
    utter.lang = "en-US";
    utter.rate = 1.1;
  }
  utter.pitch = 1.5;
  const voice = availableVoices.find(v => 
    v.lang.toLowerCase().includes(utter.lang.toLowerCase()) && 
    (v.name.toLowerCase().includes("child") || v.name.toLowerCase().includes("female"))
  ) || availableVoices.find(v => v.lang.toLowerCase().includes(utter.lang.toLowerCase()));
  if (voice) {
    utter.voice = voice;
  }
  synth.speak(utter);
}

// History Functions
function addToHistory(command) {
  conversationHistory.unshift({
    command: command,
    timestamp: new Date().toLocaleString()
  });
  if (conversationHistory.length > 10) {
    conversationHistory.pop();
  }
  updateHistoryDisplay();
  saveHistory();
}

function updateHistoryDisplay() {
  if (conversationHistory.length === 0) {
    commandHistory.innerHTML = "<div>No commands yet</div>";
    return;
  }
  // Use DocumentFragment for better performance if needed
  const fragment = document.createDocumentFragment();
  commandHistory.innerHTML = "";
  conversationHistory.forEach(item => {
    const div = document.createElement("div");
    div.className = "command-item";
    div.onclick = () => useHistoryItem(item.command);
    const strong = document.createElement("strong");
    strong.textContent = item.command;
    const small = document.createElement("small");
    small.textContent = item.timestamp;
    div.appendChild(strong);
    div.appendChild(small);
    fragment.appendChild(div);
  });
  commandHistory.appendChild(fragment);
}

function useHistoryItem(command) {
  textInput.value = command;
  textInput.focus();
}

function clearConversation() {
  output.textContent = "";
  conversationHistory = [];
  updateHistoryDisplay();
  saveHistory();
}

function saveHistory() {
  localStorage.setItem('goluHistory', JSON.stringify(conversationHistory));
}

function loadHistory() {
  const saved = localStorage.getItem('goluHistory');
  if (saved) {
    conversationHistory = JSON.parse(saved);
    updateHistoryDisplay();
  }
}

// Utility function to escape HTML
function escapeHtml(unsafe) {
  return unsafe
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
