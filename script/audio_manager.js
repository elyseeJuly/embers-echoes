/**
 * 余烬回响 (Embers' Echoes) — 音频管理器 (Audio Manager)
 * ======================================================
 * 原生 Web Audio API 实现的音频调度与播放引擎。
 * 支持音轨缓存、全局静音、BGM 平滑淡入淡出、事件音乐抢占与 SFX 混音播放。
 */
var AudioManager = {
    FADE_TIME: 1.5, // 淡入淡出时长 (秒)
    AUDIO_CACHE: {}, // 音频 Buffer 缓存

    _ctx: null, // AudioContext 实例
    _masterGain: null, // 全局主音量控制节点
    _bgmGain: null, // 背景音乐音量控制节点
    _sfxGain: null, // 音效音量控制节点

    _currentBGM: null, // 当前播放的背景音乐 { source, gainNode, src }
    _currentEventBGM: null, // 当前播放的事件/地牢音乐 { source, gainNode, src }

    _muted: false, // 是否静音
    _initialized: false, // 是否已初始化

    // 音频库定义
    Library: {
        // 主题曲
        THEME: 'audio/Ragnarök [cache Memoriae].mp3',

        // 场景 BGM (营地篝火阶段)
        MUSIC_FIRE_DEAD: 'audio/fire-dead.flac',
        MUSIC_FIRE_SMOLDERING: 'audio/fire-smoldering.flac',
        MUSIC_FIRE_FLICKERING: 'audio/fire-flickering.flac',
        MUSIC_FIRE_BURNING: 'audio/fire-burning.flac',
        MUSIC_FIRE_ROARING: 'audio/fire-roaring.flac',

        // 据点规模 BGM (森林与规模扩建)
        MUSIC_SILENT_FOREST: 'audio/silent-forest.flac',
        MUSIC_LONELY_HUT: 'audio/lonely-hut.flac',
        MUSIC_TINY_VILLAGE: 'audio/tiny-village.flac',
        MUSIC_MODEST_VILLAGE: 'audio/modest-village.flac',
        MUSIC_LARGE_VILLAGE: 'audio/large-village.flac',
        MUSIC_RAUCOUS_VILLAGE: 'audio/raucous-village.flac',

        // 大地图与空间阶段 BGM
        MUSIC_WORLD: 'audio/world.flac',
        MUSIC_SPACE: 'audio/space.flac',
        MUSIC_ENDING: 'audio/ending.flac',
        MUSIC_SHIP: 'audio/ship.flac',

        // 战斗遭遇 BGM
        ENCOUNTER_TIER_1: 'audio/encounter-tier-1.flac',
        ENCOUNTER_TIER_2: 'audio/encounter-tier-2.flac',
        ENCOUNTER_TIER_3: 'audio/encounter-tier-3.flac',

        // 事件 BGM (抢占背景音轨)
        EVENT_NOMAD: 'audio/event-nomad.flac',
        EVENT_NOISES_OUTSIDE: 'audio/event-noises-outside.flac',
        EVENT_NOISES_INSIDE: 'audio/event-noises-inside.flac',
        EVENT_BEGGAR: 'audio/event-beggar.flac',
        EVENT_SHADY_BUILDER: 'audio/event-shady-builder.flac',
        EVENT_MYSTERIOUS_WANDERER: 'audio/event-mysterious-wanderer.flac',
        EVENT_SCOUT: 'audio/event-scout.flac',
        EVENT_WANDERING_MASTER: 'audio/event-wandering-master.flac',
        EVENT_SICK_MAN: 'audio/event-sick-man.flac',
        EVENT_RUINED_TRAP: 'audio/event-ruined-trap.flac',
        EVENT_HUT_FIRE: 'audio/event-hut-fire.flac',
        EVENT_SICKNESS: 'audio/event-sickness.flac',
        EVENT_PLAGUE: 'audio/event-plague.flac',
        EVENT_BEAST_ATTACK: 'audio/event-beast-attack.flac',
        EVENT_SOLDIER_ATTACK: 'audio/event-soldier-attack.flac',
        EVENT_THIEF: 'audio/event-thief.flac',

        // 地点与建筑 SFX
        LANDMARK_FRIENDLY_OUTPOST: 'audio/landmark-friendly-outpost.flac',
        LANDMARK_SWAMP: 'audio/landmark-swamp.flac',
        LANDMARK_CAVE: 'audio/landmark-cave.flac',
        LANDMARK_TOWN: 'audio/landmark-town.flac',
        LANDMARK_CITY: 'audio/landmark-city.flac',
        LANDMARK_HOUSE: 'audio/landmark-house.flac',
        LANDMARK_BATTLEFIELD: 'audio/landmark-battlefield.flac',
        LANDMARK_BOREHOLE: 'audio/landmark-borehole.flac',
        LANDMARK_CRASHED_SHIP: 'audio/landmark-crashed-ship.flac',
        LANDMARK_SULPHUR_MINE: 'audio/landmark-sulphurmine.flac',
        LANDMARK_COAL_MINE: 'audio/landmark-coalmine.flac',
        LANDMARK_IRON_MINE: 'audio/landmark-ironmine.flac',
        LANDMARK_DESTROYED_VILLAGE: 'audio/landmark-destroyed-village.flac',

        // 交互与动作 SFX
        LIGHT_FIRE: 'audio/light-fire.flac',
        STOKE_FIRE: 'audio/stoke-fire.flac',
        BUILD: 'audio/build.flac',
        CRAFT: 'audio/craft.flac',
        BUY: 'audio/buy.flac',
        GATHER_WOOD: 'audio/gather-wood.flac',
        CHECK_TRAPS: 'audio/check-traps.flac',
        EMBARK: 'audio/embark.flac',
        EAT_MEAT: 'audio/eat-meat.flac',
        USE_MEDS: 'audio/use-meds.flac',
        DEATH: 'audio/death.flac',
        REINFORCE_HULL: 'audio/reinforce-hull.flac',
        UPGRADE_ENGINE: 'audio/upgrade-engine.flac',
        LIFT_OFF: 'audio/lift-off.flac',
        CRASH: 'audio/crash.flac',

        // 大地图移动步子 (随机)
        FOOTSTEPS_1: 'audio/footsteps-1.flac',
        FOOTSTEPS_2: 'audio/footsteps-2.flac',
        FOOTSTEPS_3: 'audio/footsteps-3.flac',
        FOOTSTEPS_4: 'audio/footsteps-4.flac',
        FOOTSTEPS_5: 'audio/footsteps-5.flac',
        FOOTSTEPS_6: 'audio/footsteps-6.flac',

        // 武器战斗 SFX
        WEAPON_UNARMED_1: 'audio/weapon-unarmed-1.flac',
        WEAPON_UNARMED_2: 'audio/weapon-unarmed-2.flac',
        WEAPON_UNARMED_3: 'audio/weapon-unarmed-3.flac',
        WEAPON_MELEE_1: 'audio/weapon-melee-1.flac',
        WEAPON_MELEE_2: 'audio/weapon-melee-2.flac',
        WEAPON_MELEE_3: 'audio/weapon-melee-3.flac',
        WEAPON_RANGED_1: 'audio/weapon-ranged-1.flac',
        WEAPON_RANGED_2: 'audio/weapon-ranged-2.flac',
        WEAPON_RANGED_3: 'audio/weapon-ranged-3.flac',

        // 飞船太空战斗陨石遭遇
        ASTEROID_HIT_1: 'audio/asteroid-hit-1.flac',
        ASTEROID_HIT_2: 'audio/asteroid-hit-2.flac',
        ASTEROID_HIT_3: 'audio/asteroid-hit-3.flac',
        ASTEROID_HIT_4: 'audio/asteroid-hit-4.flac',
        ASTEROID_HIT_5: 'audio/asteroid-hit-5.flac',
        ASTEROID_HIT_6: 'audio/asteroid-hit-6.flac',
        ASTEROID_HIT_7: 'audio/asteroid-hit-7.flac',
        ASTEROID_HIT_8: 'audio/asteroid-hit-8.flac'
    },

    /**
     * 初始化音频引擎，绑定声音解锁交互
     */
    init: function () {
        if (AudioManager._initialized) return;

        try {
            // 读取静音偏好
            var savedMute = localStorage.getItem('embers_audio_muted');
            AudioManager._muted = (savedMute === 'true');

            // 建立 AudioContext 与增益链路
            AudioManager._ctx = new (window.AudioContext || window.webkitAudioContext)();
            
            // 主声道 gain
            AudioManager._masterGain = AudioManager._ctx.createGain();
            AudioManager._masterGain.gain.setValueAtTime(AudioManager._muted ? 0.0 : 1.0, AudioManager._ctx.currentTime);
            AudioManager._masterGain.connect(AudioManager._ctx.destination);

            // BGM 分流 gain (默认略微轻柔，防止喧宾夺主)
            AudioManager._bgmGain = AudioManager._ctx.createGain();
            AudioManager._bgmGain.gain.setValueAtTime(0.7, AudioManager._ctx.currentTime);
            AudioManager._bgmGain.connect(AudioManager._masterGain);

            // SFX 分流 gain
            AudioManager._sfxGain = AudioManager._ctx.createGain();
            AudioManager._sfxGain.gain.setValueAtTime(0.9, AudioManager._ctx.currentTime);
            AudioManager._sfxGain.connect(AudioManager._masterGain);

            AudioManager._initialized = true;

            // 监听第一次点击事件以解决 Autoplay 拦截限制
            $(document).one('click touchstart', function () {
                AudioManager.unlock();
            });

            // 动态注入静音 UI 按钮
            AudioManager.renderUI();

        } catch (e) {
            console.error('音频引擎初始化失败:', e);
        }
    },

    /**
     * 解决现代浏览器 Autoplay 限制的解锁方法
     */
    unlock: function () {
        if (AudioManager._ctx && AudioManager._ctx.state === 'suspended') {
            AudioManager._ctx.resume().then(function () {
                console.log('音频信道已解锁激活 (Web Audio Context Unlocked).');
            });
        }
    },

    /**
     * 动态绘制 Header 右上角声音控制开关
     */
    renderUI: function () {
        // 防止重复添加
        if ($('#audio-toggle').length > 0) return;

        var $toggle = $('<div>')
            .attr('id', 'audio-toggle')
            .css({
                position: 'absolute',
                right: '24px',
                top: '12px',
                fontFamily: 'var(--font-terminal)',
                fontSize: '0.8rem',
                color: 'var(--ash-light)',
                cursor: 'pointer',
                userSelect: 'none',
                zIndex: 1000
            });

        AudioManager.updateUIButton($toggle);

        $toggle.on('click', function () {
            AudioManager.toggleMute();
            AudioManager.updateUIButton($(this));
        });

        $('#ee-header').append($toggle);
    },

    updateUIButton: function ($el) {
        if (AudioManager._muted) {
            $el.html('[ <span style="color: var(--ash-dim)">🔇 声音: 关</span> ]');
        } else {
            $el.html('[ <span style="color: var(--ember-glow)">🔊 声音: 开</span> ]');
        }
    },

    /**
     * 加载并解码音频文件 (支持缓存)
     */
    loadAudio: function (src) {
        if (!AudioManager._initialized) return Promise.reject('音频引擎未就位');

        // 处理本地绝对路径
        var fullSrc = src;
        if (src.indexOf('http') === -1) {
            var basePath = window.location.origin + window.location.pathname;
            if (basePath.endsWith('index.html')) {
                basePath = basePath.slice(0, -10);
            }
            fullSrc = basePath + (basePath.endsWith('/') ? '' : '/') + src;
        }

        if (AudioManager.AUDIO_CACHE[fullSrc]) {
            return Promise.resolve(AudioManager.AUDIO_CACHE[fullSrc]);
        }

        return fetch(new Request(fullSrc))
            .then(function (response) {
                return response.arrayBuffer();
            })
            .then(function (buffer) {
                return new Promise(function (resolve, reject) {
                    AudioManager._ctx.decodeAudioData(buffer, function (decoded) {
                        AudioManager.AUDIO_CACHE[fullSrc] = decoded;
                        resolve(decoded);
                    }, function (err) {
                        console.error('音频解码出错:', fullSrc, err);
                        reject(err);
                    });
                });
            });
    },

    /**
     * 播放背景音乐 (带自动平滑淡入淡出)
     */
    playBGM: function (key, fadeMs) {
        if (!AudioManager._initialized || !key) return;

        var src = AudioManager.Library[key] || key;
        if (AudioManager._currentBGM && AudioManager._currentBGM.src === src) return; // 已经在播了

        var duration = (fadeMs !== undefined) ? fadeMs / 1000 : AudioManager.FADE_TIME;

        // 1. 如果当前有正在播放的事件独占音乐，先切换后台底层音轨，不抢占前台
        if (AudioManager._currentEventBGM) {
            // 静默释放原有的底层背景音轨
            if (AudioManager._currentBGM) {
                try { AudioManager._currentBGM.source.stop(); } catch (e) {}
            }
            AudioManager._currentBGM = { src: src, source: null, gainNode: null };
            return;
        }

        // 2. 正常淡出当前 BGM
        AudioManager._fadeAndStopBGM(AudioManager._currentBGM, duration);

        // 3. 加载并播放新 BGM
        AudioManager.loadAudio(src).then(function (buffer) {
            // 确保未在加载期间被其他播放命令覆盖
            if (AudioManager._currentEventBGM) return; 

            var source = AudioManager._ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            var trackGain = AudioManager._ctx.createGain();
            trackGain.gain.setValueAtTime(0.0, AudioManager._ctx.currentTime);

            source.connect(trackGain);
            trackGain.connect(AudioManager._bgmGain);

            source.start(0);
            trackGain.gain.linearRampToValueAtTime(1.0, AudioManager._ctx.currentTime + duration);

            AudioManager._currentBGM = {
                src: src,
                source: source,
                gainNode: trackGain
            };
        }).catch(function (err) {
            console.warn('BGM 加载失败:', src, err);
        });
    },

    /**
     * 播放突发事件/战斗独占 BGM (淡出当前背景音乐，播放事件音乐)
     */
    playEventBGM: function (key) {
        if (!AudioManager._initialized || !key) return;

        var src = AudioManager.Library[key] || key;
        if (AudioManager._currentEventBGM && AudioManager._currentEventBGM.src === src) return;

        var duration = AudioManager.FADE_TIME;

        // 1. 淡出当前普通背景音乐 (但不停止，只拉低音量)
        if (AudioManager._currentBGM && AudioManager._currentBGM.gainNode) {
            var currVal = AudioManager._currentBGM.gainNode.gain.value;
            AudioManager._currentBGM.gainNode.gain.cancelScheduledValues(AudioManager._ctx.currentTime);
            AudioManager._currentBGM.gainNode.gain.setValueAtTime(currVal, AudioManager._ctx.currentTime);
            AudioManager._currentBGM.gainNode.gain.linearRampToValueAtTime(0.0, AudioManager._ctx.currentTime + duration);
        }

        // 2. 停止原有的事件音乐
        AudioManager._fadeAndStopBGM(AudioManager._currentEventBGM, duration);

        // 3. 加载播放新事件 BGM
        AudioManager.loadAudio(src).then(function (buffer) {
            var source = AudioManager._ctx.createBufferSource();
            source.buffer = buffer;
            source.loop = true;

            var trackGain = AudioManager._ctx.createGain();
            trackGain.gain.setValueAtTime(0.0, AudioManager._ctx.currentTime);

            source.connect(trackGain);
            trackGain.connect(AudioManager._bgmGain);

            source.start(0);
            trackGain.gain.linearRampToValueAtTime(1.0, AudioManager._ctx.currentTime + duration);

            AudioManager._currentEventBGM = {
                src: src,
                source: source,
                gainNode: trackGain
            };
        });
    },

    /**
     * 结束事件音乐，淡入还原普通背景音乐
     */
    stopEventBGM: function () {
        if (!AudioManager._initialized) return;
        if (!AudioManager._currentEventBGM) return;

        var duration = AudioManager.FADE_TIME;

        // 1. 淡出并停止事件音乐
        AudioManager._fadeAndStopBGM(AudioManager._currentEventBGM, duration);
        AudioManager._currentEventBGM = null;

        // 2. 还原恢复被压低的普通背景音乐
        if (AudioManager._currentBGM) {
            if (AudioManager._currentBGM.gainNode) {
                var currVal = AudioManager._currentBGM.gainNode.gain.value;
                AudioManager._currentBGM.gainNode.gain.cancelScheduledValues(AudioManager._ctx.currentTime);
                AudioManager._currentBGM.gainNode.gain.setValueAtTime(currVal, AudioManager._ctx.currentTime);
                AudioManager._currentBGM.gainNode.gain.linearRampToValueAtTime(1.0, AudioManager._ctx.currentTime + duration);
            } else if (AudioManager._currentBGM.src) {
                // 如果之前只是占位，这里重新拉起来播放
                var cacheSrc = AudioManager._currentBGM.src;
                AudioManager._currentBGM = null;
                AudioManager.playBGM(cacheSrc, duration * 1000);
            }
        }
    },

    /**
     * 播放单次 SFX 音效 (支持重合混音)
     */
    playSFX: function (key) {
        if (!AudioManager._initialized || !key) return;

        var src = AudioManager.Library[key] || key;

        AudioManager.loadAudio(src).then(function (buffer) {
            var source = AudioManager._ctx.createBufferSource();
            source.buffer = buffer;
            source.connect(AudioManager._sfxGain);
            source.start(0);
        }).catch(function (err) {
            // 优雅静默忽略
        });
    },

    /**
     * 停止并淡出给定的音轨节点
     */
    _fadeAndStopBGM: function (bgmObj, duration) {
        if (bgmObj && bgmObj.source && bgmObj.gainNode) {
            var srcNode = bgmObj.source;
            var gainNode = bgmObj.gainNode;
            
            var currVal = gainNode.gain.value;
            gainNode.gain.cancelScheduledValues(AudioManager._ctx.currentTime);
            gainNode.gain.setValueAtTime(currVal, AudioManager._ctx.currentTime);
            gainNode.gain.linearRampToValueAtTime(0.0, AudioManager._ctx.currentTime + duration);

            setTimeout(function () {
                try {
                    srcNode.stop();
                } catch (e) {}
            }, duration * 1000 + 100);
        }
    },

    /**
     * 切换静音状态
     */
    toggleMute: function () {
        AudioManager._muted = !AudioManager._muted;
        localStorage.setItem('embers_audio_muted', AudioManager._muted);

        if (AudioManager._masterGain) {
            var volume = AudioManager._muted ? 0.0 : 1.0;
            AudioManager._masterGain.gain.setValueAtTime(volume, AudioManager._ctx.currentTime);
        }

        // 解锁音频环境
        AudioManager.unlock();
    }
};
