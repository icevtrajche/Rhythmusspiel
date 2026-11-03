<script lang="ts">
  import { onMount, onDestroy } from 'svelte';

  let { onBack }: { onBack: () => void } = $props();

  const lessons = [
    { title: 'Single notes', description: 'Press the matching lane key when the note reaches the hit line. Try D first.', hint: 'Tap D', keys: ['d'], hold: false },
    { title: 'Switch lanes', description: 'Notes can appear in any lane. Keep your fingers ready and follow the pattern.', hint: 'Tap J', keys: ['j'], hold: false },
    { title: 'Jumps', description: 'Two notes can arrive together. Press both keys at nearly the same time.', hint: 'Press F + K together', keys: ['f', 'k'], hold: false },
    { title: 'Hold notes', description: 'A long note needs a sustained press. Keep the key down, then release it.', hint: 'Hold D for a moment', keys: ['d'], hold: true },
    { title: 'Hold + tap', description: 'Keep one lane held while tapping another lane. Independent fingers matter.', hint: 'Hold F, then tap K', keys: ['f', 'k'], hold: true },
    { title: 'Rolls', description: 'Rapid alternating notes reward relaxed, consistent movement rather than mashing.', hint: 'Tap D, F, J, K in order', keys: ['d', 'f', 'j', 'k'], hold: false },
  ];

  let index = $state(0);
  let pressed = $state<string[]>([]);
  let completed = $state(false);
  let holdStarted = 0;
  let holdReady = false;
  let rollProgress = 0;
  let feedback = $state('Waiting for input…');
  const current = $derived(lessons[index]);

  function keyDown(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    if (!['d', 'f', 'j', 'k'].includes(key) || event.repeat) return;
    event.preventDefault();
    if (pressed.includes(key)) return;
    pressed = [...pressed, key];

    if (current.hold && index === 3 && key === 'd') {
      holdStarted = performance.now();
      feedback = 'Keep holding…';
    } else if (current.hold && index === 4 && key === 'f') {
      holdStarted = performance.now();
      feedback = 'Nice. Keep F held and tap K.';
    } else if (index === 2 && current.keys.every((item) => pressed.includes(item))) {
      completeStep('Jump landed!');
    } else if (index === 5) {
      const expected = current.keys[rollProgress];
      if (key === expected) {
        rollProgress++;
        feedback = rollProgress === current.keys.length ? 'Clean roll!' : `Good. Next: ${current.keys[rollProgress].toUpperCase()}`;
        if (rollProgress === current.keys.length) completeStep('Roll completed!');
      } else {
        rollProgress = 0;
        feedback = 'Start the roll again at D.';
      }
    } else if (!current.hold && current.keys.length === 1 && key === current.keys[0]) {
      completeStep('Good timing!');
    } else if (current.hold && index === 4 && key === 'k' && pressed.includes('f')) {
      completeStep('Hold + tap completed!');
    }
  }

  function keyUp(event: KeyboardEvent) {
    const key = event.key.toLowerCase();
    pressed = pressed.filter((item) => item !== key);
    if (current.hold && index === 3 && key === 'd' && holdStarted) {
      holdReady = performance.now() - holdStarted >= 650;
      if (holdReady) completeStep('Hold completed!');
      else feedback = 'A little longer. Try again.';
      holdStarted = 0;
    }
    if (current.hold && index === 4 && key === 'f' && holdStarted) {
      if (performance.now() - holdStarted >= 400 && pressed.includes('k')) completeStep('Hold + tap completed!');
      holdStarted = 0;
    }
  }

  function completeStep(message: string) {
    completed = true;
    feedback = message;
  }

  function next() {
    if (index < lessons.length - 1) {
      index++;
      pressed = [];
      completed = false;
      holdReady = false;
      holdStarted = 0;
      rollProgress = 0;
      feedback = 'Waiting for input…';
    } else {
      feedback = 'All lessons completed. You are ready to play.';
    }
  }

  onMount(() => {
    window.addEventListener('keydown', keyDown);
    window.addEventListener('keyup', keyUp);
  });
  onDestroy(() => {
    window.removeEventListener('keydown', keyDown);
    window.removeEventListener('keyup', keyUp);
  });
</script>

<div class="tutorial-shell">
  <header><a class="brand" href="/" onclick={(event) => { event.preventDefault(); onBack(); }}>BEAT<span>DROP</span></a><button type="button" onclick={onBack}>← BACK TO MENU</button></header>
  <main>
    <div class="eyebrow">TRAINING MODE · {index + 1} / {lessons.length}</div>
    <h1>Learn the <span>rhythm.</span></h1>
    <div class="progress"><div style="width: {(index / lessons.length) * 100}%"></div></div>
    <section class="lesson-card">
      <div class="lesson-index">LESSON {String(index + 1).padStart(2, '0')}</div>
      <h2>{current.title}</h2>
      <p>{current.description}</p>
      <div class="keys">
        {#each ['d', 'f', 'j', 'k'] as key}
          <div class="key" class:lit={pressed.includes(key)}>{key.toUpperCase()}</div>
        {/each}
      </div>
      <div class="hint">{current.hint}</div>
      <div class="feedback" class:success={completed}>{feedback}</div>
      <button type="button" class="next" disabled={!completed} onclick={next}>{index === lessons.length - 1 ? 'FINISH TRAINING' : 'NEXT LESSON'} →</button>
    </section>
    <p class="footnote">Use the D · F · J · K keys on your keyboard. You can leave training at any time.</p>
  </main>
</div>

<style>
  .tutorial-shell{min-height:100svh;background:radial-gradient(ellipse at 50% 25%,rgba(124,58,237,.14),transparent 48%),#080910;color:#f4f4f8;padding:0 clamp(20px,6vw,92px)}
  header{height:76px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(255,255,255,.08)}
  .brand{font-size:21px;font-weight:950;letter-spacing:-1.2px;color:#fff;text-decoration:none}.brand span,h1 span{color:#a78bfa}
  header button{border:1px solid rgba(255,255,255,.12);background:rgba(255,255,255,.03);border-radius:7px;color:#aaaaba;padding:10px 13px;font-size:9px;font-weight:850;letter-spacing:1px}
  main{width:min(620px,100%);margin:90px auto}.eyebrow{color:#a78bfa;font-size:10px;font-weight:900;letter-spacing:2px}
  h1{font-size:clamp(42px,7vw,64px);letter-spacing:-3px;margin:14px 0 24px} .progress{height:4px;background:#202031;border-radius:9px;overflow:hidden}.progress div{height:100%;background:#a78bfa;transition:width .2s}
  .lesson-card{margin-top:26px;padding:clamp(24px,5vw,42px);border:1px solid rgba(255,255,255,.1);border-radius:14px;background:linear-gradient(145deg,rgba(25,25,43,.97),rgba(13,14,24,.97));box-shadow:0 28px 80px rgba(0,0,0,.3)}
  .lesson-index{color:#77788b;font-size:9px;font-weight:900;letter-spacing:1.7px}.lesson-card h2{font-size:30px;margin:10px 0}.lesson-card p{color:#9293a6;line-height:1.7;font-size:13px;min-height:44px}
  .keys{display:flex;justify-content:center;gap:12px;margin:30px 0 22px}.key{width:56px;height:56px;display:grid;place-items:center;border:1px solid rgba(255,255,255,.16);border-radius:9px;background:#171725;color:#aaaaba;font:800 18px ui-monospace,monospace;transition:.1s}.key.lit{background:rgba(167,139,250,.25);border-color:#a78bfa;color:#fff;box-shadow:0 0 22px rgba(167,139,250,.3);transform:translateY(-3px)}
  .hint{text-align:center;color:#c4b5fd;font-size:11px;font-weight:800;letter-spacing:.5px}.feedback{text-align:center;min-height:30px;margin-top:18px;color:#85869a;font-size:11px}.feedback.success{color:#86efac}
  .next{display:block;width:100%;margin-top:12px;padding:14px;border:0;border-radius:8px;background:#a78bfa;color:#100b20;font-size:10px;font-weight:950;letter-spacing:1.1px}.next:disabled{opacity:.28;cursor:not-allowed}
  .footnote{text-align:center;color:#656678;font-size:10px;margin-top:20px}
  @media(max-width:520px){main{margin:54px auto}header{height:62px}.key{width:48px;height:48px}}
</style>
