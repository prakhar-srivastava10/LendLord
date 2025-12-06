// Data model and storage
const STORAGE_KEY = 'lendlord_people_v1';

let people = loadPeople();
let selectedIndex = null;

function loadPeople() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function savePeople() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(people));
}
function nowDateISO() {
  return new Date().toISOString().split('T')[0];
}

// UI elements
const peopleListEl = document.getElementById('peopleList');
const searchInputEl = document.getElementById('searchInput');
const sortAlphaBtn = document.getElementById('sortAlphaBtn');
const sortRecentBtn = document.getElementById('sortRecentBtn');

const welcomeEl = document.getElementById('welcome');
const personPanelEl = document.getElementById('personPanel');
const personNameEl = document.getElementById('personName');
const personNotesEl = document.getElementById('personNotes');
const owedToYouEl = document.getElementById('owedToYou');
const youOweEl = document.getElementById('youOwe');
const netBalanceEl = document.getElementById('netBalance');
const transactionListEl = document.getElementById('transactionList');

const addPersonBtn = document.getElementById('addPersonBtn');
const editPersonBtn = document.getElementById('editPersonBtn');
const deletePersonBtn = document.getElementById('deletePersonBtn');

const addTransactionBtn = document.getElementById('addTransactionBtn');

const overlayEl = document.getElementById('overlay');
const personModalEl = document.getElementById('personModal');
const personModalTitleEl = document.getElementById('personModalTitle');
const personNameInputEl = document.getElementById('personNameInput');
const personNotesInputEl = document.getElementById('personNotesInput');
const savePersonBtn = document.getElementById('savePersonBtn');

const transactionModalEl = document.getElementById('transactionModal');
const transactionModalTitleEl = document.getElementById('transactionModalTitle');
const amountInputEl = document.getElementById('amountInput');
const typeInputEl = document.getElementById('typeInput');
const dateInputEl = document.getElementById('dateInput');
const noteInputEl = document.getElementById('noteInput');
const saveTransactionBtn = document.getElementById('saveTransactionBtn');

const sidebarEl = document.getElementById('sidebar');
const openSidebarBtn = document.getElementById('openSidebarBtn');
const closeSidebarBtn = document.getElementById('closeSidebarBtn');
const homeLink = document.getElementById('homeLink');
const homepageEl = document.getElementById('homepage');
const globalLentEl = document.getElementById('globalLent');
const globalBorrowedEl = document.getElementById('globalBorrowed');
const globalNetEl = document.getElementById('globalNet');
const currencySelect = document.getElementById('currencySelect');

let currentCurrency = 'INR';

// Sidebar mobile controls
openSidebarBtn.addEventListener('click', () => {
  sidebarEl.classList.add('show');
  overlayShow(true);
});
closeSidebarBtn.addEventListener('click', () => {
  sidebarEl.classList.remove('show');
  overlayShow(false);
});
overlayEl.addEventListener('click', () => {
  closeAllModals();
  sidebarEl.classList.remove('show');
});

// Render people list
function renderPeopleList() {
  const q = (searchInputEl.value || '').trim().toLowerCase();
  peopleListEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  people.forEach((p, i) => {
    const nameMatch = p.name.toLowerCase().includes(q);
    const notesMatch = (p.notes || '').toLowerCase().includes(q);
    if (q && !nameMatch && !notesMatch) return;

    const li = document.createElement('li');
    li.className = 'person-item new-item';
    li.dataset.index = i;

    const left = document.createElement('div');
    left.className = 'person-left';

    const title = document.createElement('span');
    title.className = 'person-name';
    title.textContent = p.name;

    const meta = document.createElement('span');
    meta.className = 'person-meta';
    const lastDate = p.lastActivity || '—';
    meta.textContent = `Last: ${lastDate}`;

    left.appendChild(title);
    left.appendChild(meta);

    const right = document.createElement('span');
    right.className = 'balance-badge';
    const net = calcNet(p);
    right.style.color = net >= 0 ? 'var(--green)' : 'var(--red)';
    right.textContent = formatCurrency(net);

    li.appendChild(left);
    li.appendChild(right);

    li.addEventListener('click', () => selectPerson(i));
    fragment.appendChild(li);
  });

  peopleListEl.appendChild(fragment);
}
searchInputEl.addEventListener('input', renderPeopleList);

// Select person
function selectPerson(index) {
  selectedIndex = index;
  const p = people[index];

  personNameEl.textContent = p.name;
  personNotesEl.textContent = p.notes || '';
  updateStats(p);
  renderTransactions(p);

  homepageEl.classList.add('hidden');   // hide homepage
  welcomeEl.classList.add('hidden');
  personPanelEl.classList.remove('hidden');

  sidebarEl.classList.remove('show');
  overlayShow(false);
}


// Stats
function calcNet(person) {
  const owedToYou = sumType(person, 'lent');
  const youOwe = sumType(person, 'borrowed');
  return owedToYou - youOwe;
}
function sumType(person, type) {
  return (person.transactions || [])
    .filter(t => t.type === type)
    .reduce((acc, t) => acc + (Number(t.amount) || 0), 0);
}
function updateStats(person) {
  const owedToYou = sumType(person, 'lent');
  const youOwe = sumType(person, 'borrowed');
  const net = owedToYou - youOwe;

  owedToYouEl.textContent = formatCurrency(owedToYou);
  youOweEl.textContent = formatCurrency(youOwe);
  netBalanceEl.textContent = formatCurrency(net);

  // Pulse on update
  owedToYouEl.classList.add('pulse');
  youOweEl.classList.add('pulse');
  netBalanceEl.classList.add('pulse');
  setTimeout(() => {
    owedToYouEl.classList.remove('pulse');
    youOweEl.classList.remove('pulse');
    netBalanceEl.classList.remove('pulse');
  }, 320);

  // Save balance + last activity
  person.balance = net;
  savePeople();
  renderPeopleList(); // update sidebar badges
}

// Transactions
function renderTransactions(person) {
  transactionListEl.innerHTML = '';
  const fragment = document.createDocumentFragment();

  (person.transactions || []).forEach((t, idx) => {
    const li = document.createElement('li');
    li.className = 'transaction-item new-item';

    const main = document.createElement('div');
    main.className = 'tx-main';

    const amount = document.createElement('span');
    amount.className = 'tx-amount';
    amount.textContent = formatCurrency(t.amount);

    const note = document.createElement('span');
    note.className = 'tx-note';
    note.textContent = t.note || '';

    main.appendChild(amount);
    if (t.note) main.appendChild(note);

    const type = document.createElement('span');
    type.className = 'tx-type ' + (t.type === 'lent' ? 'green' : 'red');
    type.textContent = t.type === 'lent' ? 'They owe you' : 'You owe';

    const date = document.createElement('span');
    date.className = 'tx-date';
    date.textContent = t.date;

    const del = document.createElement('button');
    del.className = 'tx-delete';
    del.textContent = '🗑';
    del.title = 'Delete';
    del.addEventListener('click', () => {
      deleteTransaction(idx);
    });

    li.appendChild(main);
    li.appendChild(type);
    li.appendChild(date);
    li.appendChild(del);

    fragment.appendChild(li);
  });

  transactionListEl.appendChild(fragment);
}
function deleteTransaction(txIndex) {
  if (selectedIndex == null) return;
  const p = people[selectedIndex];
  p.transactions.splice(txIndex, 1);
  p.lastActivity = todayIfAny(p);
  savePeople();
  updateStats(p);
  renderTransactions(p);
}
function todayIfAny(person) {
  return (person.transactions || []).length ? nowDateISO() : null;
}

// Add person modal
let personModalMode = 'add'; // 'add' | 'edit'
addPersonBtn.addEventListener('click', () => {
  personModalMode = 'add';
  personModalTitleEl.textContent = 'Add Person';
  personNameInputEl.value = '';
  personNotesInputEl.value = '';
  openModal(personModalEl);
});
editPersonBtn.addEventListener('click', () => {
  if (selectedIndex == null) return;
  const p = people[selectedIndex];
  personModalMode = 'edit';
  personModalTitleEl.textContent = 'Edit Person';
  personNameInputEl.value = p.name || '';
  personNotesInputEl.value = p.notes || '';
  openModal(personModalEl);
});
savePersonBtn.addEventListener('click', () => {
  const name = (personNameInputEl.value || '').trim();
  const notes = (personNotesInputEl.value || '').trim();
  if (!name) {
    alert('Name is required.');
    return;
  }
  if (personModalMode === 'add') {
    people.push({
      name,
      notes,
      transactions: [],
      balance: 0,
      lastActivity: null,
      createdAt: nowDateISO(),
    });
    savePeople();
    renderPeopleList();
  } else {
    const p = people[selectedIndex];
    p.name = name;
    p.notes = notes;
    savePeople();
    personNameEl.textContent = p.name;
    personNotesEl.textContent = p.notes || '';
    renderPeopleList();
  }
  closeAllModals();
});

// Delete person
deletePersonBtn.addEventListener('click', () => {
  if (selectedIndex == null) return;
  const p = people[selectedIndex];
  const ok = confirm(`Delete ${p.name}? This will remove all transactions.`);
  if (!ok) return;
  people.splice(selectedIndex, 1);
  selectedIndex = null;
  savePeople();
  renderPeopleList();
  personPanelEl.classList.add('hidden');
  homepageEl.classList.add('hidden');   // hide homepage
  welcomeEl.classList.remove('hidden');
});


// Transactions modal
addTransactionBtn.addEventListener('click', () => {
  if (selectedIndex == null) {
    alert('Select a person first.');
    return;
  }
  transactionModalTitleEl.textContent = 'Add Transaction';
  amountInputEl.value = '';
  typeInputEl.value = 'lent';
  dateInputEl.value = nowDateISO();
  noteInputEl.value = '';
  openModal(transactionModalEl);
});
saveTransactionBtn.addEventListener('click', () => {
  if (selectedIndex == null) return;
  const rawAmount = amountInputEl.value;
  const amount = Number(rawAmount);
  const type = typeInputEl.value;
  const date = dateInputEl.value || nowDateISO();
  const note = noteInputEl.value.trim();

  if (!rawAmount || isNaN(amount) || amount <= 0) {
    alert('Please enter a valid amount.');
    return;
  }
  if (!['lent', 'borrowed'].includes(type)) {
    alert('Invalid type.');
    return;
  }

  const p = people[selectedIndex];
  p.transactions.push({ amount, type, date, note });
  p.lastActivity = date;
  savePeople();

  updateStats(p);
  renderTransactions(p);
  closeAllModals();
});

// Sorting
sortAlphaBtn.addEventListener('click', () => {
  people.sort((a, b) => a.name.localeCompare(b.name));
  savePeople();
  renderPeopleList();
});
sortRecentBtn.addEventListener('click', () => {
  people.sort((a, b) => {
    const ad = a.lastActivity ? new Date(a.lastActivity).getTime() : 0;
    const bd = b.lastActivity ? new Date(b.lastActivity).getTime() : 0;
    return bd - ad;
  });
  renderPeopleList();
});

// Modal helpers
function openModal(el) {
  overlayShow(true);
  el.classList.add('show');
  el.classList.remove('hidden');
}
function closeAllModals() {
  overlayShow(false);
  [personModalEl, transactionModalEl].forEach(el => {
    el.classList.remove('show');
    el.classList.add('hidden');
  });
}
function overlayShow(on) {
  if (on) overlayEl.classList.add('show'), overlayEl.classList.remove('hidden');
  else overlayEl.classList.remove('show'), overlayEl.classList.add('hidden');
}
// Close modals with [data-close] buttons
document.querySelectorAll('[data-close]').forEach(btn =>
  btn.addEventListener('click', closeAllModals)
);

// Helpers
function formatCurrency(n, currency = currentCurrency) {
  return new Intl.NumberFormat(undefined, {
    style: 'currency',
    currency,
    maximumFractionDigits: 2
  }).format(n);
}


// Initial render
renderPeopleList();
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("sw.js")
    .then(() => console.log("Service Worker registered"));
}
homeLink.addEventListener('click', (e) => {
  e.preventDefault();
  showHomepage();
});

function showHomepage() {
  homepageEl.classList.remove('hidden');
  welcomeEl.classList.add('hidden');
  personPanelEl.classList.add('hidden');
  updateGlobalStats();
}

function updateGlobalStats() {
  let totalLent = 0;
  let totalBorrowed = 0;

  people.forEach(p => {
    p.transactions.forEach(t => {
      if (t.type === 'lent') totalLent += t.amount;
      else if (t.type === 'borrowed') totalBorrowed += t.amount;
    });
  });

  const net = totalLent - totalBorrowed;

  globalLentEl.textContent = formatCurrency(totalLent, currentCurrency);
  globalBorrowedEl.textContent = formatCurrency(totalBorrowed, currentCurrency);
  globalNetEl.textContent = formatCurrency(net, currentCurrency);
}
currencySelect.addEventListener('change', (e) => {
  currentCurrency = e.target.value;
  // Re-render all stats and transactions
  if (!personPanelEl.classList.contains('hidden')) {
    const p = people[selectedIndex];
    updateStats(p);
    renderTransactions(p);
  }
  updateGlobalStats();
});
