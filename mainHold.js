const { Observable, Subject, BehaviorSubject, from, range, fromEvent, Scheduler, interval, never, merge } = rxjs;
const { map, filter, switchMap, takeUntil, pipe, repeat, take, repeatWhen, observeOn, bufferCount, first, skipWhile, distinctUntilChanged, pluck } = rxjs.operators;
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
let printed = 0;
let printStats$ = new BehaviorSubject({printed: 0, time: Date.now()});
// emit a snapshot per second
interval(1000).subscribe(() => printStats$.next({printed: printed, time: Date.now()}));
// process the snapshots
printStats$.pipe(
  bufferCount(2,1), // take last two emitted items
  map(([last, current]) => speedDiff(last, current)), // compute current speed
).subscribe(speed => printLog.textContent = speed); // update speed display 


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
      state.run = true;
      f1();
    }
  };
  document.addEventListener('keydown', handler1, { once: true });
  
  const handler2 = (evt) => {
    if (evt.keyCode === actionKeyCode) {
      state.run = false;
    }
    document.addEventListener('keydown', handler1, { once: true });
  }
  document.addEventListener('keyup', handler2, {once: true});
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
  const keyups$ = fromEvent(document, 'keyup').pipe(filter(e => e.keyCode === actionKeyCode));
  const activityStart$ = merge(keydowns$, keyups$, rxjs.of({type: 'joker'})) // add a single emission observable for bufferCount initialization
                              .pipe(pluck('type'),             // all we need is the event type
                                    distinctUntilChanged(),    // joker down down down up down down up --->  joker down up down up
                                    bufferCount(2));           // j d u d u d u d ---> [j,d] [u,d] [u,d] [u,d]
  const activityEnd$ = keyups$;

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
    
  const sub1 = activityStart$.subscribe((e) => {
    console.log('run');
    state.run = true;
    f1();
  });
  subscriptions.push(sub1);
  const sub2 = activityEnd$.subscribe((e) => {
    console.log('stop');
    state.run = false;
  });
  subscriptions.push(sub2);
}


// 5. Observables -- Subject nexting in an f1-f2 loop.
function script_nextingInLoop() {
  let state = { run: false };
  scriptStates.push(state);

  const keydowns$ = fromEvent(document, 'keydown').pipe(filter(e => e.keyCode === actionKeyCode));
  const keyups$ = fromEvent(document, 'keyup').pipe(filter(e => e.keyCode === actionKeyCode));
  const activityStart$ = merge(keydowns$, keyups$, rxjs.of({type: 'joker'})) // add a single emission observable for bufferCount initialization
                              .pipe(pluck('type'),             // all we need is the event type
                                    distinctUntilChanged(),    // joker down down down up down down up --->  joker down up down up
                                    bufferCount(2));           // j d u d u d u d ---> [j,d] [u,d] [u,d] [u,d]
  const activityEnd$ = keyups$;

  let fire$ = new Subject();
  // const fireSub = fire$.pipe(take(100), observeOn(async))
  const firesub = fire$.pipe(observeOn(async))
                      .subscribe(() => {
                        // console.log('observed');
                        f2();
                      });
  subscriptions.push(firesub);

  function f1() {
    // console.log('fire: nexting');
    // debugger;
    fire$.next();
    // Promise.resolve().then(()=>console.log('stack empty'))
  }
  function f2() {
    if (state.run) {
      // console.log('updating text');
      updateText();
      f1();
    } else return;    
  }

  const sub1 = activityStart$.subscribe((e) => {
    state.run = true;
    console.log('started');
    f1(); // start firing

    // for testing
    // requestAnimationFrame(() => {
    //   console.log('========== painting 1');
    //   requestAnimationFrame(() => {
    //     console.log('========== painting 2');
    //   })
    // });
    
  });
  subscriptions.push(sub1);

  const sub2 = keyups$.subscribe((e) => {
    state.run = false;
    console.log('stopped');
  });
  subscriptions.push(sub2);
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
  printStats$.next({printed: 0, time: Date.now()}) 
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
function insertCharacter() {
  return insertCharacters[Math.floor(Math.random() * insertCharacters.length)];
}
function updateText() {
  if (radioAccum.checked) {
    display.textContent += insertCharacter();
  } else if (radioReplace.checked) {
    display.textContent = '!~~refreshing this text~~!';
  }
  printed++;
}
function speedDiff(last, current) {
  return ((current.printed - last.printed)/(current.time - last.time)*1000).toFixed(2);
}