// The night's story. Pemberton the landlord locks the doors at 2 a.m. unless
// the jar is full. Every smash feeds the jar; the regulars dare you for more.
export const CAST = {
  sal: { name: 'SAL', color: '#fff0c4' }, tex: { name: 'TEX', color: '#ff2d95' }, dol: { name: 'DOLORES', color: '#00e5ff' },
  hank: { name: 'HANK', color: '#ffe600' }, riv: { name: 'RIVET', color: '#b26bff' }, lime: { name: 'LIME', color: '#9dff00' },
  gus: { name: 'GUS', color: '#ff8a00' }, pearl: { name: 'PEARL', color: '#ff5ad0' }, doug: { name: 'DOUG', color: '#ff7a2a' },
  pem: { name: 'MR. PEMBERTON', color: '#c8ffd8' }, insp: { name: 'THE INSPECTOR', color: '#ff7a6a' }, lou: { name: 'LOU', color: '#4ad6c8' }, '': { name: '', color: '#fff' },
};

export const PERKS = {
  card: ["Pemberton's Card", 'every drink is free'],
  steady: ['Steady Hand', 'less sway, tighter throws'], olive: ['Lucky Olive', 'streaks pay double'],
  liver: ['Iron Liver', 'aim arc lasts longer drunk'], shrapnel: ['Shrapnel', 'smashes hit neighbours'],
  pockets: ['All Pockets', 'carry nine drinks'], tips: ['Big Tipper', 'jar fills 50% faster'],
};

const QUESTS = [
  { id: 'sal', who: ['sal'], title: 'Break literally anything', need: 1, test: e => e.killed, jar: 60,
    done: [['sal', 'There it is. That sound pays the rent.']] },
  { id: 'tex', who: ['tex'], title: 'Knock down ducks', need: 4, test: e => e.type === 'duck', perk: 'steady',
    offer: [['tex', "Name's Tex. Ran the duck gallery at the county fair for thirty years."], ['tex', "Never once got to hit one. Knock four of them ducks down for me."]],
    remind: [['tex', "Them ducks ain't gonna humble themselves."]],
    done: [['tex', 'Four ducks. I felt every one.'], ['tex', 'Fair-hand secret for you: breathe out when you throw.']],
    idle: ["Ducks had it comin'.", 'Breathe out. Then throw.'] },
  { id: 'dol', who: ['dol'], title: "Smash Gerald's TVs", need: 3, test: e => e.type === 'tv' && e.killed, perk: 'olive',
    offer: [['dol', 'Dolores. Those televisions back there belonged to my ex-husband, Gerald.'], ['dol', 'Gerald loved those televisions. Break three.']],
    remind: [['dol', 'Gerald is still winning, dear.']],
    done: [['dol', 'Oh, Gerald felt that.'], ['dol', 'Take my lucky olive. Streaks run hotter with it.']],
    idle: ['To Gerald. May his reception be poor.', 'Another round, another television.'] },
  { id: 'hank', who: ['hank'], title: 'Back-shelf smashes while Tipsy+', need: 2, test: e => e.killed && e.x >= 30.5 && e.type !== 'bullseye' && e.level >= 3.5, perk: 'liver',
    offer: [['hank', 'Hank. I believe a person only truly aims once they stop trying to.'], ['hank', 'Get Tipsy. Then break two things off the far back shelf.']],
    remind: [['hank', 'Too sober, or too close. The shelf is patient.']],
    done: [['hank', 'See? The bottle knew.'], ['hank', "You'll keep your eye a little longer now, even in your cups."]],
    idle: ['The glass is neither half full nor half empty. It is airborne.', 'Every bottle is already broken. We just help it along.'] },
  { id: 'riv', who: ['riv'], title: 'Disco ball while Hammered', need: 1, test: e => e.type === 'disco' && e.killed && e.level >= 6.5, perk: 'shrapnel',
    offer: [['riv', "Rivet. I hung that disco ball in '09. I've hated it since '09."], ['riv', 'Get properly Hammered and take it out. Sober is cheating.']],
    remind: [['riv', "Still spinning. Still mocking me. And you're not nearly drunk enough."]],
    done: [['riv', 'BEAUTIFUL.'], ['riv', "Here's how we did it in the pit: make it spray."]],
    idle: ['It grew back. It always grows back.', 'Louder next time.'] },
  { id: 'lime', who: ['lime'], title: 'Bring bottles tumbling', need: 3, test: e => e.chain, perk: 'pockets',
    offer: [['lime', "Can't stop, song's too good. Listen:"], ['lime', 'Bottle pyramids. Pull the bottom, the top comes down. Give me three falling bottles.']],
    remind: [['lime', 'Aim low on the pyramids! The bottom row!']],
    done: [['lime', 'Ha! Like dominoes.'], ['lime', "Take my jacket. It's all pockets."]],
    idle: ['This song has been playing since Tuesday.', 'Dance with your whole elbow.'] },
  { id: 'gp', who: ['gus', 'pearl'], title: 'Hit five in a row', need: 5, test: e => e.streak, abs: true, perk: 'tips',
    offer: [['gus', 'Pearl here says you can hit five in a row.'], ['pearl', "And Gus says you can't hit the floor."], ['gus', 'Twenty bucks says no.'], ['pearl', 'Go make me rich, sweetheart.']],
    remind: [['gus', 'Still waiting on that five.'], ['pearl', "Don't listen to him."]],
    done: [['pearl', 'FIVE. Pay up, Gus.'], ['gus', 'Unbelievable.'], ['pearl', 'My winnings go in the jar, hon. Tips count extra now.']],
    idle: ['Double or nothing, Pearl.', "Gus, you don't have nothing left to double."] },
];

QUESTS.push({ id: 'pem', who: ['pem'], title: 'Hit the golden duck', need: 3, test: e => e.gold, perk: 'card', after: 'saved',
  offer: [['pem', "Don't look at me. ...Fine. Sal says I have to 'participate'."], ['pem', 'There is a golden duck on that conveyor. I have decided I resent it.'], ['pem', 'Strike it three times. I shall observe. Disdainfully.']],
  remind: [['pem', 'The duck persists. As do I.']],
  done: [['pem', 'Hm. Adequate. More than adequate. Do NOT tell the others I smiled.'], ['pem', "Take my card. Your drinks are on Pemberton Holdings now. It's a write-off."]],
  idle: ['I own four parking lots. Nobody has ever cheered in one.', 'Sal put a tiny umbrella in my drink. I did not ask for it. I am keeping it.'] });

const PEM_CRY = { trophy: 'My club championship trophy!', portrait: 'That portrait was OIL!', cat: 'Not Mr. Whiskers!', condo: 'That model cost more than this building!', forsale: '...That sign was a rental.' };

export class Story {
  constructor(api) {
    this.api = api; this.q = {}; QUESTS.forEach(d => this.q[d.id] = { d, state: 'new', n: 0 });
    this.perks = new Set(); this.jar = 0; this.goal = 1500; this.phase = 'night'; this.met = new Set(); this.left = 5; this.dirty = true; this.night = 1; this.fines = 0;
  }
  has(p) { return this.perks.has(p); }
  quest(who) { return Object.values(this.q).find(q => q.d.who.includes(who)); }
  marker(who) {
    if (who === 'lou') return !this.met.has('lou');
    if (who === 'pem' && this.phase !== 'saved') return this.phase === 'lastcall' && !this.met.has('pem');
    const q = this.quest(who); return !!q && who !== 'sal' && (q.state === 'new' || q.state === 'done');
  }

  salIntro() {
    this.met.add('sal'); const q = this.q.sal; q.state = 'active'; this.dirty = true;
    return [['sal', 'New face. Welcome to the last honest bar in town.'],
      ['sal', "Landlord's a man named Pemberton. Wants to turn the range into condos."],
      ['sal', "We've got 'til two a.m. to fill that jar or he changes the locks."],
      ['sal', "Every smash puts money in it. The regulars will dare you for more. First round's on me. Go break something."]];
  }
  salClaim() { const q = this.q.sal; if (q.state !== 'done') return null; return this.claim(q); }

  claim(q) {
    q.state = 'claimed'; this.dirty = true;
    this.addJar(q.d.jar ?? 120, true);
    if (q.d.perk) { this.perks.add(q.d.perk); this.api.toast(PERKS[q.d.perk][0].toUpperCase()); }
    return q.d.done;
  }

  talk(who) {
    if (who === 'lou') {
      const first = !this.met.has('lou'); this.met.add('lou');
      if (first) return [['lou', 'ID?'], ['lou', "...Kidding. Nobody's ever checked. I'm Lou. I bounce. Mostly I stand."], ['lou', "Tip: Sal talks. The regulars dare. And don't hit Doug."]];
      const L = this.phase === 'saved' ? ["Heard you saved the place. I'd have helped, but I was standing here.", 'Pemberton tipped me on the way in. A nickel. I framed it.']
        : ["Still raining. It's always raining. I think it's just this street.", 'Loud in there tonight. Good loud.', 'If you black out, Doug carries you. If Doug blacks out, I carry Doug.'];
      return [['lou', L[Math.floor(Math.random() * L.length)]]];
    }
    this.met.add(who);
    if (who === 'pem' && this.phase !== 'saved') return [['pem', 'So this is the establishment. Charming, in the way mould is charming.'], ['pem', 'I had my personal effects brought over to measure for the lobby.'], ['pem', 'Do NOT touch them.']];
    const q = this.quest(who); if (!q) return [];
    if (q.state === 'new') { q.state = 'active'; this.dirty = true; return q.d.offer; }
    if (q.state === 'active') return [...q.d.remind, [q.d.who[0], `(${Math.min(q.n, q.d.need)} of ${q.d.need} so far.)`]];
    if (q.state === 'done') return this.claim(q);
    return [[who, q.d.idle[Math.floor(Math.random() * q.d.idle.length)]]];
  }

  event(e) {
    for (const q of Object.values(this.q)) {
      if (q.state !== 'active') continue;
      const r = q.d.test(e); if (!r) continue;
      q.n = q.d.abs ? Math.max(q.n, r) : q.n + 1; this.dirty = true;
      if (q.n >= q.d.need) {
        q.state = 'done';
        this.api.toast('DARE DONE'); this.api.say('', `Go tell ${CAST[q.d.who.at(-1)].name}.`, 3.5);
      }
    }
    if (e.finale && e.killed) {
      this.left--; this.dirty = true;
      this.api.queue([['pem', PEM_CRY[e.type]]]);
      if (this.left <= 0) { this.phase = 'saved'; this.api.saved(); }
    }
  }

  addJar(n, quiet) {
    if (this.phase !== 'night') return;
    this.jar = Math.min(this.goal, this.jar + n * (this.has('tips') && !quiet ? 1.5 : 1)); this.dirty = true;
    if (this.jar >= this.goal) { if (this.night === 2) { this.phase = 'saved'; this.api.permit(); } else { this.phase = 'lastcall'; this.api.lastCall(); } }
  }

  startNight2() { this.night = 2; this.phase = 'night'; this.jar = 0; this.goal = 2500; this.dirty = true; }
  fine(n) { this.fines++; this.jar = Math.max(0, this.jar - n); this.dirty = true; }
  clock() {
    if (this.phase === 'lastcall') return 'LAST CALL';
    if (this.phase === 'saved') return 'AFTER HOURS';
    const m = Math.floor(21 * 60 + (this.jar / this.goal) * 299), h = Math.floor(m / 60) % 24;
    return `${((h + 11) % 12) + 1}:${String(m % 60).padStart(2, '0')} ${h >= 12 && h < 24 ? 'PM' : 'AM'}`;
  }

  tracker() {
    const out = [];
    if (this.phase === 'lastcall') out.push(`<li class="hot">Smash Pemberton's things <b>${5 - this.left}/5</b></li>`);
    if (this.phase === 'saved') out.push(this.night === 2 ? '<li class="ok">Permit granted. The bar is bulletproof.</li>' : '<li class="ok">The bar is saved. Everything pays double.</li>');
    if (this.phase === 'saved' && this.night === 1) out.push('<li>Step outside to call it a night</li>');
    if (this.night === 2 && this.phase === 'night') out.push('<li class="hot">Fill the jar for the permit</li><li>Never throw while he watches <b>fines: ' + this.fines + '</b></li>');
    for (const q of Object.values(this.q)) {
      if (q.state === 'active') out.push(`<li>${q.d.title} <b>${Math.min(q.n, q.d.need)}/${q.d.need}</b></li>`);
      if (q.state === 'done') out.push(`<li class="ok">Tell ${CAST[q.d.who.at(-1)].name} it's done</li>`);
    }
    if (this.perks.size) out.push(`<li class="perks">${[...this.perks].map(p => PERKS[p][0]).join(' · ')}</li>`);
    return out.join('');
  }
}

export const DOUG = {
  miss: ["Wall's undefeated.", 'Floor: one. You: nothing.', "I'll sweep that. I sweep everything.", "Close! No it wasn't.", 'The targets are the colourful things.', 'Bold. Wrong, but bold.'],
  big: ["Now THAT'S a mess. Beautiful.", 'I felt that in my broom.', 'Oh, that one had family.'],
  ow: ['OW. Rule three! RULE THREE!', "I'm a person, not a target! Mostly!", "That's coming out of your score."],
  sweep: ["Coming through. Hold your fire. Or don't. Nobody listens."],
};
