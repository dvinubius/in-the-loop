const { Observable, Subject, ReplaySubject, from, of, range, fromEvent, Scheduler, interval } = rxjs;
const { map, filter, switchMap, takeUntil, pipe, repeat, take, repeatWhen, observeOn } = rxjs.operators;
const async = rxjs.asyncScheduler;
const animationFrame = rxjs.animationFrameScheduler;

// event handling and subscription management
const handlers = [];
const subscriptions = [];

// what to display
const insertCharacters = ['+', 'o', '~', '.'];
const actionKeyCode = 65;

// DOM access
const display = document.querySelector('.result');
const printLog = document.querySelector('.result-num span');
const buttons = Array.prototype.slice.call(document.querySelectorAll('button'));
const radioAccum = document.querySelector('#accum');
const radioReplace = document.querySelector('#replace');

// global state for some the scripts
const scriptStates = []; // anonymous state objects {run: boolean};

// execution anaylitics
let lastPrintTime = Date.now();
let lastPrintCount;
let printed = 0;
speedReport = interval(1000).subscribe(tick => updateSpeed());


function buttonPressed(e) {
  reset();
  e.target.style.backgroundColor = 'lightgreen';
  // execute associated script
  const scriptIndex = +e.target.getAttribute('data-script');
  console.log('running ' + (scriptIndex));
  switch (scriptIndex) {
    case 1: listenerCBControlLoopTimeout();
      return;
    case 2: listenerCBControlLoopRAF();
      return;
    case 3: observableControlLoopTimeout();
      return;
    case 4: observableControlLoopRAF();
      return;
    case 5: script_nextingInLoop();
      return;
    case 6: script_KeydownObservablesUpdateDOM();
      return;
    case 7: script_KeydownEventsUpdateDOM();
  }
}

// ====== SCRIPTS ====== //

// 1. f1-f2 loop, do while flag, event listener callbacks for flag control. updateDOM with setTimeouts.
function listenerCBControlLoopTimeout() {
  listenerCBControlLoop(setTimeout);
}

// 2. f1-f2 loop, do while flag, event listener callbacks for flag control. update DOM on RAF
function listenerCBControlLoopRAF() {
  listenerCBControlLoop(requestAnimationFrame);
}

function listenerCBControlLoop(updateMethod) {
  const state = { run: false };
  scriptStates.push(state);

  function f1() {
    updateMethod(f2);
  }

  function f2() {
    if (!state.run) {
      return;
    }
    updateText();
    f1();
  }

  const handler1 = (evt) => {
    if (evt.keyCode === actionKeyCode) {
      evt.preventDefault();
      state.run = !state.run;
      if (state.run) {
        f1();
      }
    }
  };
  document.addEventListener('keydown', handler1);
  handlers.push({ target: document, eventType: 'keydown', handler: handler1 });
}

// 3. Observables -- continuous f1-f2 loop, execute while flag, observables control flag, DOM update on setTimeout
function observableControlLoopTimeout() {
  observableControlLoop(setTimeout);
}
// 4. Observables -- continuous f1-f2 loop, execute while flag, observables control flag, DOM update on RAF
function observableControlLoopRAF() {
  observableControlLoop(requestAnimationFrame);
}

function observableControlLoop(updateMethod) {
  const state = { run: false };
  scriptStates.push(state);
  const keydowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === actionKeyCode));

  function f1() {
    updateMethod(f2);
  }

  function f2() {
    if (!state.run) {
      return;
    }
    updateText();
    f1();
  }

  const sub1 = keydowns$.subscribe((e) => {
    e.preventDefault();
    state.run = !state.run;
    if (state.run) {
      f1();
    }
  });
  subscriptions.push(sub1);
}


// 5. Observables -- Subject nexting in an f1-f2 loop.
function script_nextingInLoop() {
  let state = { run: false };
  scriptStates.push(state);

  const keydowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === actionKeyCode));
  let fire$;
  let fireSub;

  function f1() {
    console.log('fire: nexting');
    // debugger;
    fire$.next();
    Promise.resolve().then(()=>console.log('stack empty'))
  }
  function f2() {
    if (!state.run) {
      fireSub.unsubscribe();
      return;
    }
    console.log('updating text');
    updateText();
    f1();
  }

  const sub1 = keydowns$.subscribe((e) => {
    state.run = !state.run;
    console.log(state.run ? 'going' : 'stopped');
    if (state.run) {
      fire$ = new Subject();
      fireSub = fire$.pipe(take(100), observeOn(async))
        .subscribe(() => {
          console.log('observed');
          f2();
        });
      f1();
      e.preventDefault();
      requestAnimationFrame(() => {
        console.log('========== painting 1');
        requestAnimationFrame(() => {
          console.log('========== painting 2');
        })
      });
    }
  });
  subscriptions.push(sub1);
}

// HOLD PRESSED: 

// 6. No loops: Observables from keydown events -- updateDOM when observale nexts.
function script_KeydownObservablesUpdateDOM() {
  const keydowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === actionKeyCode));
  const sub = keydowns$.subscribe(() => {
    updateText();
  });
  subscriptions.push(sub);
}
// 7. No loops: Keydown events - update DOM on callback
function script_KeydownEventsUpdateDOM() {
  const handler1 = (evt) => {
    if (evt.keyCode === actionKeyCode) {
      evt.preventDefault();
      updateText();
    }
  };
  document.addEventListener('keydown', handler1);
  handlers.push({ target: document, eventType: 'keydown', handler: handler1 });
}

// ======== Global STATE & Subscription/Event Handling MANAGEMENT ========== //
function resetEventHandling() {
  handlers.forEach(({ target: target, eventType: type, handler: handler }) => {
    target.removeEventListener(type, handler);
  });
}
function resetSubscriptions() {
  subscriptions.forEach(sub => sub.unsubscribe());
}
function reset() {
  display.textContent = '';
  printLog.textContent = '';
  printed = 0;
  lastPrintCount = 0;
  lastPrintTime = Date.now();
  document.querySelectorAll('button').forEach(b => {
    b.blur();
    b.style.backgroundColor = 'lightgrey';
  });
  resetEventHandling();
  resetSubscriptions();
  scriptStates.forEach(st => st.run = false);
  scriptStates.splice(0);
}

// ======= Helpers ======= //
function preventDefault(e) {
  e.preventDefault();
}
function insertCharacter() {
  return insertCharacters[Math.floor(Math.random() * insertCharacters.length)];
}
function updateText() {
  if (radioAccum.checked) {
    display.textContent += insertCharacter();
  } else if (radioReplace.checked) {
    display.textContent = '!refreshing this text!';
  }
  printed++;
  // if ((Date.now()-lastPrintTime) > 1000) {
  //   updateSpeed();
  // }
}
function updateSpeed() {
  console.log('updating');
  const currentPrintTime = Date.now();
  timeDiff = (currentPrintTime - lastPrintTime)/1000;
  printCountDiff = printed - lastPrintCount;
  printLog.textContent = Math.round(printCountDiff / timeDiff);
  lastPrintTime = currentPrintTime;
  lastPrintCount = printed;
}