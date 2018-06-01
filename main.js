const { Observable, Subject, ReplaySubject, from, of, range, fromEvent } = rxjs;
const { map, filter, switchMap, takeUntil, pipe, repeat, take } = rxjs.operators;

// event handling and subscription management
const handlers = [];
const subscriptions = [];

// what to display
const insertCharacters = ['+', 'o', '~', '.'];

// DOM access
const display = document.querySelector('.result');
const buttons = Array.prototype.slice.call(document.querySelectorAll('button:not(.marked)'));
const markers = Array.prototype.slice.call(document.querySelectorAll('.marked'));

// prevent scroll down response on hitting space
window.addEventListener('keydown', (e) => {
  e.preventDefault();
});

// global state vars for a few of the scripts
let stopScript1;
let stopScript2;
let stopScript4;



function buttonPressed(e) {
  reset();
  // which button?
  const index = buttons.indexOf(e.target);
  // mark the marker
  markers[index].style.backgroundColor = 'lightgreen';
  // execute associated script
  const scriptIndex = +e.target.getAttribute('data-script');
  console.log('running ' + (scriptIndex));
  switch (scriptIndex) {
    case 1: script1();
      return;
    case 2: script2();
      return;
    case 3: script3();
      return;
    case 4: script4();
      return;
    case 5: script5();
  }
}

// ====== SCRIPTS ====== //

// 1. Circular function calls, empty js stack with setTimeouts.
function script1() {
  stopScript1 = false;
  let going = false;

  function f1() {
    return setTimeout((() => going ? f2(true) : f2(false)), 0);
  }

  function f2(add) {
    if (stopScript1) {
      return;
    }
    if (going) {
      display.textContent += add ? insertCharacter() : '';
    }
    return f1();
  }

  f1(0);
  const listener1 = document.addEventListener('keydown', (evt) => {
    if (evt.keyCode === 32) {
      evt.preventDefault();
      going = true;
    }
  });
  handlers.push({target: document, eventType: 'keydown', listener: listener1});
  const listener2 = document.addEventListener('keyup', (evt) => {
    if (evt.keyCode === 32) {
      going = false;
    }
  });
  handlers.push({target: document, eventType: 'keyup', listener: listener2});
}

// 2. Circular function calls, empty js stack with requestAnimationFrame
function script2() {
  stopScript2 = false;
  let going = false;

  function f1() {
    return requestAnimationFrame(() => going ? f2(true) : f2(false));
  }

  function f2(add) {
    if (stopScript2) {
      return;
    }
    display.textContent += add ? insertCharacter() : '';
    return f1();
  }

  f1();
  const listener1 = document.addEventListener('keydown', (evt) => {
    if (evt.keyCode === 32) {
      evt.preventDefault();
      going = true;
    }
  });
  handlers.push({target: document, eventType: 'keydown', listener: listener1});
  const listener2 = document.addEventListener('keyup', (evt) => {
    if (evt.keyCode === 32) {
      going = false;
    }
  });
  handlers.push({target: document, eventType: 'keyup', listener: listener2});
}

// 3. Observables  -- execute when observale nexts
function script3() {
  const spacedowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === 32));
  const spaceups$ = fromEvent(document, 'keyup').pipe(filter(e => e.keyCode === 32));

  const addContent$ = spacedowns$.pipe(takeUntil(spaceups$), repeat());
  const sub = addContent$.subscribe(() => display.textContent += insertCharacter());
  subscriptions.push(sub);
}

// 4. Observables -- execute with flag, observables control flag
function script4() {
  stopScript4 = false;
  let going = false;
  const spacedowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === 32));
  const spaceups$ = fromEvent(document, 'keyup').pipe(filter(e => e.keyCode === 32));

  function f1() {
    return requestAnimationFrame(() => going ? f2(true) : f2(false));
  }

  function f2(add) {
    if (stopScript4) {
      return;
    }
    display.textContent += add ? insertCharacter() : '';
    return f1();
  }


  f1();
  const sub1 = spacedowns$.pipe(take(1), repeat()).subscribe((e) => {
    going = true;
    e.preventDefault();
  });
  subscriptions.push(sub1);
  const sub2 = spaceups$.subscribe(() => going = false);
  subscriptions.push(sub2);
}

function script5() {
  let going = false;
  const spacedowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === 32));
  const spaceups$ = fromEvent(document, 'keyup').pipe(filter(e => e.keyCode === 32));
  function f1() {
    requestAnimationFrame(() => f2());
  }
  function f2() {
    if (!going) {
      return;
    }
    display.textContent += insertCharacter();
    return f1();
  }
  const sub1 = spacedowns$.pipe(take(1), repeat()).subscribe((e) => {
    going = true;
    console.log('going');
    f1();
    e.preventDefault();
  });
  subscriptions.push(sub1);
  const sub2 = spaceups$.subscribe(() => {
    going = false;
    console.log('stopped');
  });
  subscriptions.push(sub2);
}

// ======== Global STATE & Subscription/Event Handling MANAGEMENT ========== //
function resetEventHandling() {
  handlers.forEach(({target: target, eventType: type, listener: listener}) => {
    target.removeEventListener(type, listener);
  });
}
function resetSubscriptions() {
  subscriptions.forEach(sub => sub.unsubscribe());
}
function reset() {
  display.textContent = '';
  document.querySelectorAll('button').forEach(b => {
    b.blur();
  });  
  document.querySelectorAll('.marked').forEach(b => {
    b.style.backgroundColor = 'lightgrey';
  })
  resetEventHandling();
  resetSubscriptions();
  stopScript1 = true;
  stopScript2 = true;
  stopScript4 = true;
}

// ======= Helpers ======= //
function preventDefault(e) {
  e.preventDefault();
}
function insertCharacter() {
  return insertCharacters[Math.floor(Math.random() * insertCharacters.length)];
}