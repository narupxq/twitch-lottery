function extractUsers(text) {
  const blocks = text.split(/\n\s*\n/).filter(b => b.trim());
  const result = [];
  const errors = [];

  let cursor = 0;

  for (const block of blocks) {
    const startIndex = text.indexOf(block, cursor);
    cursor = startIndex + block.length;

    // 開始行番号（1始まり）
    const lineNumber =
      text.substring(0, startIndex).split('\n').length;

    const lines = block
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    // 1行なら「○日前」を自動補完してから解析する（途中までコピペされたとき用）
    let fixedLines = lines.slice(0, 2);
    if (fixedLines.length === 1) fixedLines = [fixedLines[0], '○日前'];

    let targetLine = null;

    // ユーザー名っぽい行を優先して拾う（() 内があれば最優先）
    targetLine =
      fixedLines.find(l => /\([a-zA-Z0-9_]{4,25}\)/.test(l)) ||
      fixedLines.find(l => /[a-zA-Z0-9_]{4,25}/.test(l)) ||
      fixedLines[0];

    if (!targetLine) {
      errors.push({ line: lineNumber });
      continue;
    }

    const parenMatch = targetLine.match(/\(([^)]+)\)/);
    if (parenMatch && /^[a-zA-Z0-9_]{4,25}$/.test(parenMatch[1])) {
      result.push({ name: parenMatch[1], index: startIndex });
      continue;
    }

    let cleaned = targetLine;
    const regex =
      /subscriber\s*\d*|サブスクライバー|音声なしで視聴中|音声のみ|認証済み|シーズン2|GamerDuo|Wylder|LEGENDUS|GLHF\s*Pledge|Raid\s*Race|Raging\s*Wolf\s*Helm|Turbo|Ugly\s*Sweater|prime\s*gaming|prime|gaming|vip|cheer\s*\d{1,3}(?:,\d{3})*|ビッツリーダー\s*\d*|subtember\s*\d{4}|twitch\s*recap\s*\d{4}|\d+(?:\.\d+)?\s*[- ]?\s*(?:year|month)s?|\d+\s*ヶ?月|20\d{2}/gi;

    while (true) {
      const next = cleaned.replace(regex, '');
      if (next === cleaned) break;
      cleaned = next;
    }

    cleaned = cleaned.replace(/\s+/g, ' ').trim();

    const matches = [...cleaned.matchAll(/[a-zA-Z0-9_]{4,25}/g)];
    if (matches.length > 0) {
      result.push({
        name: matches[matches.length - 1][0],
        index: startIndex
      });
    } else {
      errors.push({ line: lineNumber });
    }
  }

  return { users: result, errors };
}

function normalizeInputText(text) {
  // 改行コード統一
  const normalized = text.replace(/\r\n/g, '\n');

  if (!normalized) return '';

  const trailingMatch = normalized.match(/\n*$/);
  const trailingNewlines = trailingMatch ? trailingMatch[0] : '';
  let base = normalized.slice(0, normalized.length - trailingNewlines.length);

  if (base) {
    const blocks = base.split(/\n\s*\n/).filter(b => b.trim());
    const lastBlock = blocks[blocks.length - 1] || '';
    const lines = lastBlock
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);

    // 最後のブロックが1行だけでユーザー名っぽい場合は日付行を補完
    if (lines.length === 1 && /[a-zA-Z0-9_]{4,25}/.test(lines[0])) {
      base += '\n○日前';
    }
  }

  let result = base + trailingNewlines;

  if (!result.endsWith('\n\n')) {
    if (result.endsWith('\n')) result += '\n';
    else result += '\n\n';
  }

  return result;
}

function run() {
  const text = document.getElementById('src').value;
  const { users, errors } = extractUsers(text);

  lastUsers = users;

  renderResults(users);

  document.getElementById('countNum').textContent = `${users.length} 人`;
  if (users.length > 0) {
    updateSummaryPanelVisibility(true);
    renderSummary(users);
  } else {
    updateSummaryPanelVisibility(false);
  }

  const errorInfo = document.getElementById('errorInfo');

  if (errors.length > 0) {
    errorInfo.innerHTML =
      '解釈不可：' +
      errors.map(e =>
        `<a href="#" class="error-jump" data-line="${e.line}">
          ${e.line}行目
        </a>`
      ).join(', ');

    // エラー行クリック → ジャンプ
    [...errorInfo.querySelectorAll('.error-jump')].forEach(a => {
      a.addEventListener('click', e => {
        e.preventDefault();
        jumpToLine(Number(a.dataset.line));
      });
    });
  } else {
    errorInfo.textContent = '';
  }
}

const displayNameCache = new Map();
const displayNamePending = new Set();
let lastUsers = [];
let rerenderTimer = null;
let displayNameEnabled = true;

function renderResults(users) {
  const out = document.getElementById('out');
  out.innerHTML = users
    .map(u =>
      `<div class="user-line" data-index="${u.index}" data-login="${u.name}">${u.name}</div>`
    )
    .join('');
  if (displayNameEnabled) {
    updateDisplayNames(out);
  }
}

async function fetchDisplayName(login) {
  if (!login) return null;
  if (displayNameCache.has(login)) return displayNameCache.get(login);
  if (displayNamePending.has(login)) return null;

  displayNamePending.add(login);
  try {
    const response = await fetch(
      `https://api.ivr.fi/v2/twitch/user?login=${encodeURIComponent(login)}`
    );
    if (!response.ok) throw new Error('not_found');
    const data = await response.json();
    const displayName = data?.[0]?.displayName || null;
    displayNameCache.set(login, displayName);
    return displayName;
  } catch {
    displayNameCache.set(login, null);
    return null;
  } finally {
    displayNamePending.delete(login);
  }
}

function applyDisplayName(login, displayName) {
  if (!displayNameEnabled) return;
  if (!displayName) return;
  const safeLogin = CSS.escape(login);
  const targets = document.querySelectorAll(
    `[data-login="${safeLogin}"]`
  );
  targets.forEach(el => {
    if (displayName === login) return;
    el.textContent = `${login}（${displayName}）`;
  });
}

function updateDisplayNames(container) {
  if (!displayNameEnabled) return;
  const names = [
    ...container.querySelectorAll('[data-login]')
  ].map(el => el.dataset.login);
  const unique = [...new Set(names)];

  unique.forEach(async login => {
    const cached = displayNameCache.get(login);
    if (cached !== undefined) {
      applyDisplayName(login, cached);
      return;
    }
    const displayName = await fetchDisplayName(login);
    applyDisplayName(login, displayName);
    if ((document.getElementById('summarySearch')?.value || '').trim()) {
      if (rerenderTimer) return;
      rerenderTimer = setTimeout(() => {
        rerenderTimer = null;
        renderSummary(lastUsers);
      }, 0);
    }
  });
}

function resetDisplayNames() {
  document.querySelectorAll('[data-login]').forEach(el => {
    el.textContent = el.dataset.login;
  });
}

function normalizeForSearch(value) {
  if (!value) return '';
  const normalized = value.normalize('NFKC').toLowerCase();
  return normalized.replace(/[\u30a1-\u30f6]/g, ch =>
    String.fromCharCode(ch.charCodeAt(0) - 0x60)
  );
}

function renderSummary(users) {
  const queryRaw = (document.getElementById('summarySearch')?.value || '').trim();
  const query = normalizeForSearch(queryRaw);
  const countMap = new Map();
  for (const user of users) {
    countMap.set(user.name, (countMap.get(user.name) || 0) + 1);
  }

  const rows = [...countMap.entries()]
    .map(([name, count]) => ({ name, count }))
    .filter(r => {
      if (!query) return true;
      if (normalizeForSearch(r.name).includes(query)) return true;
      if (!displayNameEnabled) return false;
      const displayName = displayNameCache.get(r.name);
      if (!displayName) return false;
      return normalizeForSearch(displayName).includes(query);
    })
    .sort((a, b) => {
      if (b.count !== a.count) return b.count - a.count;
      return a.name.localeCompare(b.name, 'en');
    });

  const list = document.getElementById('summaryList');
  list.innerHTML = rows
    .map(r =>
      `<div class="summary-row">
        <span class="summary-name-wrap">
          <span class="summary-name" data-login="${r.name}">${r.name}</span>
          <a
            class="summary-link"
            href="https://www.twitch.tv/${r.name}"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Twitchのプロフィールを開く">
            <span class="material-symbols-outlined" aria-hidden="true">open_in_new</span>
          </a>
        </span>
        <span class="summary-count">${r.count}</span>
      </div>`
    )
    .join('');

  if (displayNameEnabled) {
    updateDisplayNames(list);
  }
}

function jumpToLine(line) {
  const textarea = document.getElementById('src');
  const lines = textarea.value.split('\n');

  let index = 0;
  for (let i = 0; i < line - 1; i++) {
    index += lines[i].length + 1;
  }

  textarea.focus();
  textarea.setSelectionRange(index, index);

  const totalLines = lines.length;
  const lineHeight = textarea.scrollHeight / totalLines;

  const targetScrollTop = Math.max(
    0,
    lineHeight * (line - 3)
  );

  textarea.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  });

  syncResultHighlight();
}

// 結果クリック時 → 入力欄の該当位置へ追従
document.getElementById('out').addEventListener('click', e => {
  // user-line / error-line 以外は無視
  if (
    !e.target.classList.contains('user-line') &&
    !e.target.classList.contains('error-line')
  ) return;

  const textarea = document.getElementById('src');
  const index = Number(e.target.dataset.index);

  if (Number.isNaN(index)) return;

  textarea.focus();
  textarea.setSelectionRange(index, index);

  // caret 位置が見えるようにスクロール
  const beforeText = textarea.value.slice(0, index);
  const lineNumber = beforeText.split('\n').length;

  const totalLines = textarea.value.split('\n').length;
  const lineHeight = textarea.scrollHeight / totalLines;

  // 少し上に余裕を持たせて表示（3行分）
  const targetScrollTop = Math.max(
    0,
    lineHeight * (lineNumber - 3)
  );

  textarea.scrollTo({
    top: targetScrollTop,
    behavior: 'smooth'
  });

  syncResultHighlight();
});

function copyResult() {
  const lines = [...document.querySelectorAll('.user-line')]
    .map(el => el.textContent)
    .join('\n');

  if (!lines) return;

  navigator.clipboard.writeText(lines).then(() => {
    const el = document.getElementById('copyStatus');
    el.textContent = 'コピーしました。';
    setTimeout(() => el.textContent = '', 3000);
  });
}

const textarea = document.getElementById('src');
const lineNumbers = document.getElementById('lineNumbers');
const out = document.getElementById('out');
const summarySearch = document.getElementById('summarySearch');
const displayNameToggle = document.getElementById('displayNameToggle');
const resultsPanel = document.querySelector('.results');
const summaryPanel = document.querySelector('.summary-panel');

function updateSummaryPanelVisibility(hasUsers) {
  const shouldShow = Boolean(hasUsers);
  if (!summaryPanel || !resultsPanel) return;
  summaryPanel.classList.toggle('is-hidden', !shouldShow);
  resultsPanel.classList.toggle('is-summary-hidden', !shouldShow);
}

function updateLineNumbers() {
  const lines = textarea.value.split('\n').length;
  let html = '';
  for (let i = 1; i <= lines; i++) {
    html += i + '<br>';
  }
  lineNumbers.innerHTML = html;
}

textarea.addEventListener('scroll', () => {
  lineNumbers.scrollTop = textarea.scrollTop;
});

summarySearch.addEventListener('input', () => {
  renderSummary(extractUsers(textarea.value).users);
});

displayNameToggle.addEventListener('change', () => {
  displayNameEnabled = displayNameToggle.checked;
  if (!displayNameEnabled) {
    resetDisplayNames();
  }
  renderResults(lastUsers);
  renderSummary(lastUsers);
});

function syncResultHighlight() {
  const caret = textarea.selectionStart;
  const lines = [...document.querySelectorAll('.user-line')];

  if (!lines.length) return;

  // caret 位置以下で最も近い user-line を探す
  let current = null;
  for (const line of lines) {
    const index = Number(line.dataset.index);
    if (index <= caret) {
      current = line;
    } else {
      break;
    }
  }

  // ハイライト更新
  lines.forEach(l => l.classList.remove('active'));

  if (current) {
    current.classList.add('active');

    // 結果欄内で追従スクロール
    current.scrollIntoView({
      block: 'nearest',
      behavior: 'smooth'
    });
  }
}

// 入力欄イベント監視
['scroll', 'click', 'keyup'].forEach(evt => {
  textarea.addEventListener(evt, syncResultHighlight);
});

// ===== 入力即時抽出 =====
const srcTextarea = document.getElementById('src');

// 置換ループ防止
let isNormalizing = false;

// 入力が変わるたびに自動抽出（かつ入力値を正規化して置き換え）
srcTextarea.addEventListener('input', () => {
  if (isNormalizing) return;

  const before = srcTextarea.value;
  const caretBefore = srcTextarea.selectionStart;
  const normalized = normalizeInputText(before);
  const beforeTrim = before.replace(/\n*$/, '');
  const normalizedTrim = normalized.replace(/\n*$/, '');
  const appendedAtEnd =
    normalized.length > before.length &&
    (normalizedTrim === beforeTrim ||
      normalizedTrim.startsWith(beforeTrim));

  if (before !== normalized) {
    isNormalizing = true;

    srcTextarea.value = normalized;

    const caret = appendedAtEnd
      ? srcTextarea.value.length
      : Math.min(caretBefore, srcTextarea.value.length);
    srcTextarea.setSelectionRange(caret, caret);

    isNormalizing = false;
  }

  updateLineNumbers();
  run();
});
