const PROJECTS = [
  { id: 'aloha', name: 'Aloha Robotics', summary: 'Team hackathon prototype · medical-device maintenance' },
  { id: 'nixcare', name: 'Nixcare', summary: 'Open-source maintenance tools for NixOS' },
  { id: 'nixos', name: 'NixOS', summary: 'My declarative workstation configuration' },
];

const COMMANDS = [
  'help', 'whoami', 'projects', 'ls',
  ...PROJECTS.map(project => `open ${project.id}`),
  'about', 'travel', 'cv', 'reports', 'github', 'clear', 'exit',
];

const REPORT_URL = 'https://github.com/clschulzer/Aloha-Robotics-HH2.0/blob/0252cc55b27ff7e4f4be42e6c6b8ef458e3f5bf1/Documentation/architecture-options/sim/results/RESULTS.md';
const instances = new WeakMap();

/**
 * A command interface to the same portfolio navigation.
 * Commands only navigate or display information; nothing is executed.
 */
export function setupTerminal({ navigate, openCatalog } = {}) {
  const dialog = document.querySelector('#terminal');
  const output = document.querySelector('#terminal-output');
  const form = document.querySelector('#terminal-form');
  const input = document.querySelector('#terminal-input');
  if (!dialog || !output || !form || !input || typeof dialog.showModal !== 'function') {
    return { open() {}, close() {}, destroy() {} };
  }
  instances.get(dialog)?.destroy();

  const events = new AbortController();
  const history = [];
  let historyIndex = 0;
  let draft = '';
  let completion = null;
  let opener = null;
  let focusAfterRoute = null;
  let restoreOnClose = true;
  let alive = true;

  const listen = (element, event, handler) => {
    element?.addEventListener(event, handler, { signal: events.signal });
  };
  const element = (tag, text, className) => {
    const node = document.createElement(tag);
    if (text !== undefined) node.textContent = text;
    if (className) node.className = className;
    return node;
  };
  const append = node => {
    output.append(node);
    while (output.childElementCount > 90) output.firstElementChild.remove();
    output.scrollTop = output.scrollHeight;
    return node;
  };
  const line = (text, kind = '') => append(element('p', text, `terminal-line${kind ? ` ${kind}` : ''}`));
  const link = (label, href) => {
    const anchor = element('a', label);
    anchor.href = href;
    anchor.target = '_blank';
    anchor.rel = 'noopener noreferrer';
    return anchor;
  };
  const linkLine = (label, href) => {
    const row = element('p', undefined, 'terminal-line');
    row.append(link(label, href));
    return append(row);
  };
  const setInput = value => {
    input.value = value;
    input.setSelectionRange(value.length, value.length);
  };
  const focusDestination = () => {
    if (!document.querySelector('dialog[open]')) {
      document.querySelector('#main')?.focus({ preventScroll: true });
    }
  };
  const go = route => {
    const previousHash = window.location.hash;
    focusAfterRoute = route;
    if (typeof navigate === 'function') navigate(route);
    else window.location.hash = route;
    if (window.location.hash === previousHash) {
      focusAfterRoute = null;
      focusDestination();
    }
  };
  const leaveFor = action => {
    restoreOnClose = false;
    opener = null;
    if (dialog.open) dialog.close();
    action();
  };
  const routeLink = (label, route) => {
    const anchor = element('a', label);
    anchor.href = `#${route}`;
    listen(anchor, 'click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      leaveFor(() => go(route));
    });
    return anchor;
  };

  function help() {
    line('A few ways around.');
    const grid = element('div', undefined, 'term-grid');
    [
      ['whoami', 'The person, degree and current work'],
      ['projects / ls', 'Browse selected projects'],
      ['open <project>', 'aloha · nixcare · nixos'],
      ['about / travel', 'Go to a different chapter'],
      ['cv / reports', 'Open the original documents'],
      ['github', 'Find my public repositories'],
      ['clear / exit', 'Clear the output or close this window'],
    ].forEach(([command, description]) => {
      grid.append(element('b', command), element('span', description));
    });
    append(grid);
  }

  function projects() {
    const grid = element('div', undefined, 'term-grid');
    PROJECTS.forEach(project => {
      grid.append(routeLink(project.name, `work/${project.id}`), element('span', project.summary));
    });
    append(grid);
    const row = element('p', undefined, 'terminal-line');
    const all = element('a', 'All public & completed projects ↗');
    all.href = '#work';
    listen(all, 'click', event => {
      if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      event.preventDefault();
      leaveFor(() => typeof openCatalog === 'function' ? openCatalog() : go('work'));
    });
    row.append(all);
    append(row);
    line('Choose a project above, or type open aloha.');
  }

  function run(value) {
    const raw = value.trim().slice(0, 256);
    if (!raw) return;
    completion = null;
    if (history.at(-1) !== raw) history.push(raw);
    if (history.length > 100) history.shift();
    historyIndex = history.length;
    draft = '';
    setInput('');

    const echo = element('p', undefined, 'terminal-line command');
    echo.append(element('span', '❯ '), document.createTextNode(raw));
    append(echo);
    const command = raw.toLowerCase().replace(/\s+/g, ' ');

    if (command === 'help') help();
    else if (command === 'whoami') {
      line('Marc Teyra Galiano · Erlangen, Germany.');
      line('Studying Artificial Intelligence at FAU Erlangen-Nürnberg, with a biomedical engineering focus. Since October 2025.');
      line('Working at Siemens Healthineers since April 2026.');
      line('Code. Intelligence. The human side.');
    } else if (command === 'projects' || command === 'ls') projects();
    else if (command.startsWith('open ')) {
      const project = PROJECTS.find(item => item.id === command.slice(5));
      if (project) leaveFor(() => go(`work/${project.id}`));
      else line('Choose a project: open aloha · open nixcare · open nixos', 'error');
    } else if (command === 'open') {
      line('Choose a project: open aloha · open nixcare · open nixos');
    } else if (command === 'about' || command === 'travel') {
      leaveFor(() => go(command));
    } else if (command === 'cv') {
      const href = document.querySelector('.cv-link')?.href || new URL('./cv/marc-teyra-cv-2026-02.pdf', import.meta.url).href;
      linkLine('Read my CV · February 2026 ↗', href);
      line('This snapshot predates my current Siemens Healthineers role.');
    } else if (command === 'reports') {
      linkLine('Aloha Robotics · team engineering study ↗', REPORT_URL);
      line('Aloha Robotics team study. Synthetic simulation of maintenance-planning assumptions.');
    } else if (command === 'github') {
      linkLine('github.com/mteyra ↗', 'https://github.com/mteyra');
    } else if (command === 'clear') {
      output.replaceChildren();
    } else if (command === 'exit') {
      close();
    } else {
      line(`Unknown command: ${raw}\nType help to see what is available.`, 'error');
    }
    if (dialog.open) input.focus({ preventScroll: true });
  }

  function open() {
    if (!alive || dialog.open) {
      if (alive && dialog.open) input.focus({ preventScroll: true });
      return;
    }
    // Avoid stacking this shortcut over another active native dialog.
    if (document.querySelector('dialog[open]')) return;
    opener = document.activeElement;
    restoreOnClose = true;
    dialog.showModal();
    input.focus({ preventScroll: true });
    output.scrollTop = output.scrollHeight;
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function complete(event) {
    // Empty input and Shift+Tab retain ordinary keyboard focus navigation.
    if (event.shiftKey || !input.value.trim()) return;
    const prefix = input.value.toLowerCase().trimStart().replace(/\s+/g, ' ');
    if (!completion || completion.value !== input.value) {
      const matches = COMMANDS.filter(command => command.startsWith(prefix));
      if (!matches.length) return;
      completion = { matches, index: -1, value: input.value };
      let common = matches[0];
      while (!matches.every(command => command.startsWith(common))) common = common.slice(0, -1);
      if (common.length > prefix.length) {
        event.preventDefault();
        setInput(common);
        completion.value = common;
        return;
      }
    }
    event.preventDefault();
    completion.index = (completion.index + 1) % completion.matches.length;
    setInput(completion.matches[completion.index]);
    completion.value = input.value;
  }

  listen(form, 'submit', event => {
    event.preventDefault();
    run(input.value);
  });
  listen(input, 'input', () => {
    completion = null;
    historyIndex = history.length;
    draft = input.value;
  });
  listen(input, 'keydown', event => {
    if (event.isComposing || event.metaKey || event.ctrlKey || event.altKey) return;
    if (event.key === 'Tab') {
      complete(event);
    } else if (event.key === 'ArrowUp' && history.length) {
      event.preventDefault();
      completion = null;
      if (historyIndex === history.length) draft = input.value;
      historyIndex = Math.max(0, historyIndex - 1);
      setInput(history[historyIndex]);
    } else if (event.key === 'ArrowDown' && historyIndex < history.length) {
      event.preventDefault();
      completion = null;
      historyIndex = Math.min(history.length, historyIndex + 1);
      setInput(historyIndex === history.length ? draft : history[historyIndex]);
    }
  });
  document.querySelectorAll('.command-toggle').forEach(button => {
    listen(button, 'click', open);
  });
  dialog.querySelectorAll('.terminal-shortcuts [data-command]').forEach(button => {
    listen(button, 'click', () => run(button.dataset.command));
  });
  listen(dialog.querySelector('.close-dialog'), 'click', close);
  listen(dialog, 'click', event => {
    if (event.target !== dialog) return;
    const rect = dialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) close();
  });
  listen(dialog, 'close', () => {
    if (dialog.open || !restoreOnClose) return;
    const target = opener;
    opener = null;
    if (target?.isConnected && !dialog.contains(target) && target.getClientRects().length) {
      target.focus({ preventScroll: true });
    }
  });
  listen(window, 'hashchange', () => {
    const destination = focusAfterRoute;
    focusAfterRoute = null;
    if (destination && window.location.hash.slice(1) === destination) focusDestination();
  });
  listen(document, 'keydown', event => {
    if (event.defaultPrevented || event.isComposing || event.repeat || event.altKey) return;
    const shortcut = ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') ||
      (!event.metaKey && !event.ctrlKey && !event.shiftKey && event.key === '/');
    if (!shortcut) return;
    const path = event.composedPath();
    const editable = node => node instanceof Element && (
      node.matches('input, textarea, select, iframe') || node.isContentEditable
    );
    if (path.some(editable) || editable(document.activeElement)) return;
    if (document.querySelector('dialog[open]') && !dialog.open) return;
    event.preventDefault();
    open();
  });

  if (input.maxLength < 0) input.maxLength = 256;
  if (!output.childElementCount) {
    line('Same workspace. Your commands.');
    line('Type help to get started. ↑↓ history · Tab complete · Esc close.');
  }

  const api = {
    open,
    close,
    destroy() {
      alive = false;
      events.abort();
      if (dialog.open) dialog.close();
      if (instances.get(dialog) === api) instances.delete(dialog);
    },
  };
  instances.set(dialog, api);
  return api;
}
