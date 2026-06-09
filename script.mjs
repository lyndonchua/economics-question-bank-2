
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getFirestore, collection, getDocs, setDoc, deleteDoc, doc, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

/* =========================
   CONFIG SECTION
   1. Paste Firebase config
   2. Add OPENROUTER_API_KEY in Vercel Environment Variables
========================= */

const firebaseConfig = {
  apiKey: "AIzaSyBUgKdY5Rj3IfN2hrdXm2inCI2DkHvQ9ik",
  authDomain: "economics-question-bank.firebaseapp.com",
  projectId: "economics-question-bank",
  storageBucket: "economics-question-bank.firebasestorage.app",
  messagingSenderId: "721758535915",
  appId: "1:721758535915:web:0c6d2c4a12a6000bca7eae"
};

const OPENROUTER_MODEL = "openai/gpt-4o-mini";

const COLLECTION_NAME = "questions";

/* ========================= */

let firebaseQuestions = [];
let data = [];
let db = null;
let firebaseReady = false;
let pendingImportRecords = [];
let activeImportIndex = 0;

const selected = { YearFilter:new Set(), JCFilter:new Set(), Level:new Set(), Group:new Set() };
let activeKeyword = "";
let editingId = null;

const els = {
  status: document.getElementById("firebaseStatus"),
  resultsBody: document.getElementById("resultsBody"),
  count: document.getElementById("count"),
  keywordInput: document.getElementById("keywordInput"),
  backdrop: document.getElementById("editorBackdrop"),
  editorTitle: document.getElementById("editorTitle"),
  aiStatus: document.getElementById("aiStatus"),
  importStatus: document.getElementById("importStatus"),
  importPreview: document.getElementById("importPreview")
};

function setStatus(text, type="warn") {
  els.status.textContent = text;
  els.status.className = type === "ok" ? "status-ok" : type === "bad" ? "status-bad" : "status-warn";
}

async function initFirebase() {
  try {
    if (firebaseConfig.apiKey.startsWith("PASTE_") || firebaseConfig.projectId.startsWith("PASTE_")) {
      setStatus("Firebase config not pasted yet. Paste Firebase config to load questions from Firestore.", "warn");
      rebuildData();
      return;
    }
    const app = initializeApp(firebaseConfig);
    db = getFirestore(app);
    firebaseReady = true;
    await loadFirebaseQuestions();
    setStatus("Connected to Firebase. Added/edited questions will sync to Firestore.", "ok");
  } catch (err) {
    console.error(err);
    setStatus("Firebase connection failed. Check config and Firestore rules.", "bad");
    rebuildData();
  }
}

async function loadFirebaseQuestions() {
  if (!firebaseReady) return;
  const snap = await getDocs(collection(db, COLLECTION_NAME));
  firebaseQuestions = [];
  snap.forEach(d => firebaseQuestions.push({ id:d.id, ...d.data(), Source:"Firebase" }));
  rebuildData();
}

function rebuildData() {
  data = [...firebaseQuestions];
  rebuildButtons();
  renderTable();
}

function getOptions(key) {
  const vals = [...new Set(data.map(r => r[key]).filter(Boolean))];
  if (key === "YearFilter") {
    return vals.sort((a,b) => {
      if (a === "Before 2015") return -1;
      if (b === "Before 2015") return 1;
      return String(a).localeCompare(String(b), undefined, {numeric:true});
    });
  }
  if (key === "JCFilter") {
    return vals.sort((a,b) => {
      const priority = v => v === "All BT" ? 0 : v === "All Promo" ? 1 : 2;
      return priority(a) - priority(b) || String(a).localeCompare(String(b));
    });
  }
  if (key === "Group") return vals.sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric:true}));
  return vals.sort();
}

function makeButtons(key, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";
  getOptions(key).forEach(value => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter-btn" + (selected[key].has(value) ? " active" : "");
    btn.textContent = value;
    btn.addEventListener("click", () => {
      if (selected[key].has(value)) { selected[key].delete(value); btn.classList.remove("active"); }
      else { selected[key].add(value); btn.classList.add("active"); }
      renderTable();
    });
    container.appendChild(btn);
  });
}

function rebuildButtons() {
  makeButtons("Group", "groupButtons");
  makeButtons("YearFilter", "yearButtons");
  makeButtons("JCFilter", "jcButtons");
  makeButtons("Level", "levelButtons");
}

function selectedMatches(key, value) {
  return selected[key].size === 0 || selected[key].has(value);
}

function matchesKeyword(record, keyword) {
  if (!keyword) return true;
  return Object.values(record).join(" ").toLowerCase().includes(keyword.toLowerCase());
}

function renderKeywords(text) {
  const div = document.createElement("div");
  (text || "").split(",").map(x => x.trim()).filter(Boolean).forEach(k => {
    const span = document.createElement("span");
    span.className = "tag";
    span.textContent = k;
    div.appendChild(span);
  });
  return div;
}

function renderTable() {
  const filtered = data.filter(record =>
    selectedMatches("YearFilter", record.YearFilter) &&
    selectedMatches("JCFilter", record.JCFilter) &&
    selectedMatches("Level", record.Level) &&
    selectedMatches("Group", record.Group) &&
    matchesKeyword(record, activeKeyword)
  );

  els.resultsBody.innerHTML = "";
  filtered.forEach(record => {
    const tr = document.createElement("tr");
    ["Year", "JC", "Level", "Group"].forEach(field => {
      const td = document.createElement("td");
      td.textContent = record[field] || "";
      tr.appendChild(td);
    });

    const kwTd = document.createElement("td");
    kwTd.className = "keywords";
    kwTd.appendChild(renderKeywords(record.Keywords));
    tr.appendChild(kwTd);

    const exTd = document.createElement("td");
    exTd.className = "extracts";
    exTd.textContent = record.Extracts || "";
    tr.appendChild(exTd);

    const qTd = document.createElement("td");
    qTd.className = "question";
    qTd.textContent = record.Question || "";
    tr.appendChild(qTd);

    const actionsTd = document.createElement("td");
    actionsTd.className = "actions";

    const editBtn = document.createElement("button");
    editBtn.className = "light";
    editBtn.textContent = "Edit";
    editBtn.onclick = () => openEditor(record.id);
    actionsTd.appendChild(editBtn);

    if (!String(record.id).startsWith("base-")) {
      const delBtn = document.createElement("button");
      delBtn.className = "red";
      delBtn.textContent = "Delete";
      delBtn.onclick = () => deleteQuestion(record.id);
      actionsTd.appendChild(delBtn);
    }

    tr.appendChild(actionsTd);
    els.resultsBody.appendChild(tr);
  });
  els.count.textContent = filtered.length + " question(s) shown";
}

function openEditor(id=null) {
  editingId = id;
  const record = id ? data.find(r => r.id === id) : null;
  els.editorTitle.textContent = id ? "Edit Question" : "Add Question";
  document.getElementById("editYearFilter").value = record?.YearFilter || "";
  document.getElementById("editYear").value = record?.Year || "";
  document.getElementById("editJCFilter").value = record?.JCFilter || "";
  document.getElementById("editJC").value = record?.JC || "";
  document.getElementById("editLevel").value = record?.Level || "H2";
  document.getElementById("editGroup").value = record?.Group || "";
  document.getElementById("editKeywords").value = record?.Keywords || "";
  document.getElementById("editExtracts").value = record?.Extracts || "";
  document.getElementById("editQuestion").value = record?.Question || "";
  els.aiStatus.textContent = "";
  els.backdrop.style.display = "flex";
}

function closeEditor() {
  els.backdrop.style.display = "none";
  editingId = null;
}

function collectForm() {
  const id = editingId && !String(editingId).startsWith("base-") ? editingId : "q-" + Date.now();
  return {
    id,
    YearFilter: document.getElementById("editYearFilter").value.trim(),
    Year: document.getElementById("editYear").value.trim(),
    JCFilter: document.getElementById("editJCFilter").value.trim(),
    JC: document.getElementById("editJC").value.trim(),
    Level: document.getElementById("editLevel").value.trim(),
    Group: document.getElementById("editGroup").value.trim(),
    Keywords: document.getElementById("editKeywords").value.trim(),
    Extracts: document.getElementById("editExtracts").value.trim(),
    Question: document.getElementById("editQuestion").value.trim(),
    Source: "Firebase"
  };
}

async function saveQuestion() {
  if (!firebaseReady) return alert("Firebase is not connected. Paste your Firebase config first.");
  const record = collectForm();
  if (!record.Question) return alert("Please enter a question.");

  try {
    await setDoc(doc(db, COLLECTION_NAME, record.id), { ...record, updatedAt: serverTimestamp() });
    await loadFirebaseQuestions();
    closeEditor();
    setStatus("Saved to Firebase.", "ok");
  } catch (err) {
    console.error(err);
    alert("Could not save to Firebase. Check Firestore rules.");
  }
}

async function deleteQuestion(id) {
  if (!firebaseReady) return alert("Firebase is not connected.");
  if (!confirm("Delete this Firebase question?")) return;
  try {
    await deleteDoc(doc(db, COLLECTION_NAME, id));
    await loadFirebaseQuestions();
    setStatus("Deleted from Firebase.", "ok");
  } catch (err) {
    console.error(err);
    alert("Could not delete from Firebase.");
  }
}

async function callOpenRouter(messages, temperature=0.2) {
  const res = await fetch("/api/openrouter", {
    method:"POST",
    headers:{"Content-Type":"application/json"},
    body:JSON.stringify({ model:OPENROUTER_MODEL, messages, temperature })
  });
  if (!res.ok) {
    let detail = "";
    try { detail = (await res.json()).error || ""; } catch (_) {}
    throw new Error("AI API error " + res.status + (detail ? ": " + detail : ""));
  }
  const json = await res.json();
  return json.choices?.[0]?.message?.content?.trim() || "";
}

async function generateAIKeywords() {
  const question = document.getElementById("editQuestion").value.trim();
  const extracts = document.getElementById("editExtracts").value.trim();
  if (!question && !extracts) return alert("Enter the question or extract first.");
  els.aiStatus.textContent = "Generating keywords...";
  try {
    const text = await callOpenRouter([
      {role:"system",content:"You are an A-Level Economics teacher. Generate 5 to 8 concise economics keywords for exam question search. Return only comma-separated keywords. No explanation."},
      {role:"user",content:"Question:\n"+question+"\n\nExtracts:\n"+extracts}
    ]);
    document.getElementById("editKeywords").value = text.replace(/^Keywords:\s*/i,"");
    els.aiStatus.textContent = "Done.";
  } catch (err) {
    console.error(err);
    els.aiStatus.textContent = "Failed. Check Vercel OPENROUTER_API_KEY environment variable and model.";
  }
}

async function identifyExtractsAndQuestions() {
  const fullText = document.getElementById("editQuestion").value.trim();
  const existingExtracts = document.getElementById("editExtracts").value.trim();
  if (!fullText && !existingExtracts) return alert("Paste the full case study text into Question first, or enter extracts.");

  els.aiStatus.textContent = "Identifying extracts and questions...";
  try {
    const output = await callOpenRouter([
      {
        role:"system",
        content:`You are an A-Level Economics teacher. Separate case study material into extracts and questions.
Return valid JSON only with this structure:
{
  "extracts": "Extract 1...\n\nExtract 2...",
  "questions": "(a)...\n(b)...",
  "keywords": "keyword1, keyword2, keyword3"
}
If there are no extracts, leave extracts as an empty string. Do not invent content.`
      },
      {role:"user",content:"Text to separate:\n"+fullText+"\n\nExisting extracts if any:\n"+existingExtracts}
    ]);
    const cleaned = output.replace(/^```json\s*/i, "").replace(/^```\s*/i, "").replace(/```$/i, "").trim();
    const parsed = JSON.parse(cleaned);
    document.getElementById("editExtracts").value = parsed.extracts || "";
    document.getElementById("editQuestion").value = parsed.questions || fullText;
    if (parsed.keywords) document.getElementById("editKeywords").value = parsed.keywords;
    els.aiStatus.textContent = "Done.";
  } catch (err) {
    console.error(err);
    els.aiStatus.textContent = "Failed. AI output could not be parsed or API failed.";
  }
}

function extractRecordsFromJson(json) {
  if (Array.isArray(json)) return json;
  if (Array.isArray(json.questions)) return json.questions;
  if (Array.isArray(json.firebaseQuestions)) return json.firebaseQuestions;
  if (Array.isArray(json.data)) return json.data;
  throw new Error("JSON must be an array, or contain questions / firebaseQuestions / data array.");
}

function makeSafeId(text, fallback) {
  const base = String(text || "").trim().toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
  return base || fallback;
}

function keywordArrayToText(value) {
  if (Array.isArray(value)) return value.join("\n");
  return String(value || "")
    .split(",")
    .map(x => x.trim())
    .filter(Boolean)
    .join("\n");
}

function keywordTextToCsv(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map(x => x.trim())
    .filter(Boolean)
    .join(", ");
}

function normalizeQuestionRecord(raw, index) {
  const question = raw.Question ?? raw.question ?? raw.QuestionText ?? raw.questionText ?? "";
  const year = raw.Year ?? raw.year ?? "";
  const jc = raw.JC ?? raw.jc ?? raw.school ?? raw.School ?? "";
  const level = raw.Level ?? raw.level ?? "H2";
  const group = raw.Group ?? raw.group ?? raw.QuestionGroup ?? raw.questionGroup ?? "";
  const keywords = raw.Keywords ?? raw.keywords ?? "";
  const extracts = raw.Extracts ?? raw.extracts ?? raw.caseStudyExtracts ?? "";
  const answer = raw.Answer ?? raw.answer ?? "";
  const examinerComments = raw.ExaminerComments ?? raw.examinerComments ?? raw.ExaminerComment ?? raw.examinerComment ?? "";

  const id = raw.id || raw.ID || makeSafeId([
    year, jc, level, group, String(question).slice(0, 50)
  ].filter(Boolean).join("-"), "import-" + Date.now() + "-" + index);

  // Keep the schema clean: remove PaperType, QuestionNumber and Title even if they appear in uploaded JSON.
  return {
    id: String(id),
    YearFilter: String(raw.YearFilter ?? raw.yearFilter ?? year ?? "").trim(),
    Year: String(year ?? "").trim(),
    JCFilter: String(raw.JCFilter ?? raw.jcFilter ?? jc ?? "").trim(),
    JC: String(jc ?? "").trim(),
    Level: String(level ?? "H2").trim(),
    Group: String(group ?? "").trim(),
    Keywords: keywordTextToCsv(keywordArrayToText(keywords)),
    Extracts: String(extracts ?? "").trim(),
    Question: String(question ?? "").trim(),
    Answer: String(answer ?? "").trim(),
    ExaminerComments: String(examinerComments ?? "").trim(),
    Source: "Firebase"
  };
}

async function readSelectedJsonFile() {
  const fileInput = document.getElementById("jsonImportFile");
  const file = fileInput.files?.[0];
  if (!file) throw new Error("Choose a JSON file first.");
  const text = await file.text();
  return JSON.parse(text);
}

function stripRemovedFields(record) {
  const copy = { ...record };
  delete copy.PaperType;
  delete copy.paperType;
  delete copy.QuestionNumber;
  delete copy.questionNumber;
  delete copy.Title;
  delete copy.title;
  return copy;
}

function openImportEditor(index=0) {
  if (!pendingImportRecords.length) return;
  activeImportIndex = Math.max(0, Math.min(index, pendingImportRecords.length - 1));
  renderImportTabs();
  loadImportRecordToForm(activeImportIndex);
  document.getElementById("importEditorBackdrop").style.display = "flex";
}

function closeImportEditor() {
  saveImportFormToRecord();
  document.getElementById("importEditorBackdrop").style.display = "none";
  renderImportSummary();
}

function renderImportTabs() {
  const tabs = document.getElementById("importRecordTabs");
  tabs.innerHTML = "";
  pendingImportRecords.forEach((r, i) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "import-record-tab" + (i === activeImportIndex ? " active" : "");
    btn.textContent = `${i+1}. ${r.Group || "No group"}`;
    btn.onclick = () => {
      saveImportFormToRecord();
      activeImportIndex = i;
      renderImportTabs();
      loadImportRecordToForm(i);
    };
    tabs.appendChild(btn);
  });
}

function loadImportRecordToForm(index) {
  const r = pendingImportRecords[index];
  document.getElementById("importEditYear").value = r.Year || "";
  document.getElementById("importEditJC").value = r.JC || "";
  document.getElementById("importEditLevel").value = r.Level || "H2";
  document.getElementById("importEditGroup").value = r.Group || "";
  document.getElementById("importEditKeywords").value = keywordArrayToText(r.Keywords);
  document.getElementById("importEditExtracts").value = r.Extracts || "";
  document.getElementById("importEditQuestion").value = r.Question || "";
  document.getElementById("importEditAnswer").value = r.Answer || "";
  document.getElementById("importEditExaminerComments").value = r.ExaminerComments || "";
  renderImportValidation();
}

function saveImportFormToRecord() {
  if (!pendingImportRecords.length) return;
  const r = pendingImportRecords[activeImportIndex];
  r.Year = document.getElementById("importEditYear").value.trim();
  r.YearFilter = r.Year;
  r.JC = document.getElementById("importEditJC").value.trim();
  r.JCFilter = r.JC;
  r.Level = document.getElementById("importEditLevel").value.trim();
  r.Group = document.getElementById("importEditGroup").value.trim();
  r.Keywords = keywordTextToCsv(document.getElementById("importEditKeywords").value);
  r.Extracts = document.getElementById("importEditExtracts").value.trim();
  r.Question = document.getElementById("importEditQuestion").value.trim();
  r.Answer = document.getElementById("importEditAnswer").value.trim();
  r.ExaminerComments = document.getElementById("importEditExaminerComments").value.trim();
  r.id = makeSafeId([r.Year, r.JC, r.Level, r.Group, String(r.Question).slice(0,50)].join("-"), r.id || "import-" + Date.now());
  renderImportValidation();
  renderImportTabs();
  renderImportSummary();
}

function validateImportRecord(r) {
  const issues = [];
  if (!r.Year) issues.push("Missing Year");
  if (!r.JC) issues.push("Missing JC");
  if (!r.Level) issues.push("Missing Level");
  if (!r.Group) issues.push("Missing Group");
  if (!r.Question) issues.push("Missing Question");
  if (!r.Keywords) issues.push("No Keywords");
  return issues;
}

function renderImportValidation() {
  if (!pendingImportRecords.length) return;
  const current = {
    Year: document.getElementById("importEditYear").value.trim(),
    JC: document.getElementById("importEditJC").value.trim(),
    Level: document.getElementById("importEditLevel").value.trim(),
    Group: document.getElementById("importEditGroup").value.trim(),
    Keywords: keywordTextToCsv(document.getElementById("importEditKeywords").value),
    Question: document.getElementById("importEditQuestion").value.trim()
  };
  const issues = validateImportRecord(current);
  document.getElementById("importValidation").textContent = issues.length
    ? "⚠ Check before import:\n- " + issues.join("\n- ")
    : "✓ Ready to import this record.";
}

function renderImportSummary() {
  if (!pendingImportRecords.length) {
    els.importPreview.style.display = "none";
    els.importPreview.textContent = "";
    return;
  }
  const sample = pendingImportRecords.map((r, i) => {
    const issues = validateImportRecord(r);
    const status = issues.length ? "⚠ " + issues.join(", ") : "✓ Ready";
    const questionPreview = String(r.Question || "").slice(0, 300);
    return `${i+1}. ${r.Year || "No year"} | ${r.JC || "No JC"} | ${r.Level || "No level"} | ${r.Group || "No group"}\n${status}\n${questionPreview}${String(r.Question || "").length > 300 ? "..." : ""}`;
  }).join("\n\n");
  els.importPreview.style.display = "block";
  els.importPreview.textContent = sample;
}

async function previewJsonImport() {
  try {
    const json = await readSelectedJsonFile();
    const records = extractRecordsFromJson(json)
      .map((r, i) => normalizeQuestionRecord(stripRemovedFields(r), i))
      .filter(r => r.Question || r.Extracts);
    pendingImportRecords = records;
    activeImportIndex = 0;
    renderImportSummary();
    els.importStatus.textContent = `Processed ${records.length} record(s). Review and edit before importing.`;
    if (records.length) openImportEditor(0);
  } catch (err) {
    console.error(err);
    pendingImportRecords = [];
    els.importPreview.style.display = "block";
    els.importPreview.textContent = "";
    els.importStatus.textContent = "Import preview failed: " + err.message;
  }
}

async function importJsonToFirebase() {
  if (!firebaseReady) return alert("Firebase is not connected.");
  if (!pendingImportRecords.length) {
    await previewJsonImport();
    if (!pendingImportRecords.length) return;
  }
  saveImportFormToRecord();
  const invalid = pendingImportRecords
    .map((r, i) => ({ i, issues: validateImportRecord(r) }))
    .filter(x => x.issues.length);
  if (invalid.length) {
    const msg = invalid.slice(0, 8).map(x => `Record ${x.i+1}: ${x.issues.join(", ")}`).join("\n");
    if (!confirm(`Some records have missing fields:\n\n${msg}\n\nImport anyway?`)) return;
  }
  if (!confirm(`Import ${pendingImportRecords.length} edited record(s) into Firebase? Existing documents with the same id will be overwritten.`)) return;

  let success = 0;
  let failed = 0;
  els.importStatus.textContent = "Importing to Firebase...";

  for (const record of pendingImportRecords) {
    try {
      const cleanRecord = stripRemovedFields(record);
      await setDoc(doc(db, COLLECTION_NAME, cleanRecord.id), { ...cleanRecord, updatedAt: serverTimestamp() });
      success++;
      if (success % 50 === 0) els.importStatus.textContent = `Imported ${success}/${pendingImportRecords.length}...`;
    } catch (err) {
      console.error("Failed import", record, err);
      failed++;
    }
  }

  await loadFirebaseQuestions();
  els.importStatus.textContent = `Import completed. Success: ${success}. Failed: ${failed}.`;
  document.getElementById("importEditorBackdrop").style.display = "none";
}

function exportData() {
  const payload = { exportedAt:new Date().toISOString(), firebaseQuestions };
  const blob = new Blob([JSON.stringify(payload,null,2)], {type:"application/json"});
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "econs-question-bank-firebase-data.json";
  a.click();
  URL.revokeObjectURL(url);
}

document.getElementById("searchButton").onclick = () => { activeKeyword = els.keywordInput.value.trim(); renderTable(); };
els.keywordInput.addEventListener("keydown", e => { if (e.key === "Enter") { activeKeyword = e.target.value.trim(); renderTable(); } });
document.getElementById("resetButton").onclick = () => {
  Object.keys(selected).forEach(k => selected[k].clear());
  document.querySelectorAll(".filter-btn").forEach(b => b.classList.remove("active"));
  els.keywordInput.value = ""; activeKeyword = ""; renderTable();
};
document.getElementById("addButton").onclick = () => openEditor();
document.getElementById("syncButton").onclick = loadFirebaseQuestions;
document.getElementById("exportButton").onclick = exportData;
document.getElementById("previewJsonButton").onclick = previewJsonImport;
document.getElementById("importJsonButton").onclick = importJsonToFirebase;
document.getElementById("closeImportEditorButton").onclick = closeImportEditor;
document.getElementById("saveImportEditButton").onclick = saveImportFormToRecord;
document.getElementById("importEditedJsonButton").onclick = importJsonToFirebase;
["importEditYear","importEditJC","importEditLevel","importEditGroup","importEditKeywords","importEditExtracts","importEditQuestion","importEditAnswer","importEditExaminerComments"].forEach(id => { const el = document.getElementById(id); if (el) el.addEventListener("input", renderImportValidation); });
document.getElementById("cancelEditButton").onclick = closeEditor;
document.getElementById("saveQuestionButton").onclick = saveQuestion;
document.getElementById("aiKeywordsButton").onclick = generateAIKeywords;
document.getElementById("aiExtractButton").onclick = identifyExtractsAndQuestions;

initFirebase();
