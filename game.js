// 获取游戏元素
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const depthElement = document.getElementById('depth');
const livesElement = document.getElementById('lives');
const finalDepthElement = document.getElementById('finalDepth');
const gameOverElement = document.getElementById('gameOver');
const startButton = document.getElementById('startButton');
const restartButton = document.getElementById('restartButton');
const tryAgainButton = document.getElementById('tryAgainButton');
const leftButton = document.getElementById('leftButton');
const rightButton = document.getElementById('rightButton');

// 设置canvas尺寸
canvas.width = canvas.clientWidth;
canvas.height = canvas.clientHeight;

// 游戏常量
const GRAVITY = 0.25;
const JUMP_POWER = -8;
const PLATFORM_WIDTH = 80;
const PLATFORM_HEIGHT = 15;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const PLATFORM_SPEED = 2;
const PLATFORM_GAP = 100;
const MAX_PLATFORMS = 8;
const PLATFORM_TYPES = {
    NORMAL: 0,
    MOVING: 1,
    BREAKING: 2,
    SPIKE: 3
};

// 游戏状态
let gameRunning = false;
let player = {
    x: canvas.width / 2 - PLAYER_WIDTH / 2,
    y: 100,
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    velocityY: 0,
    velocityX: 0,
    isJumping: false,
    isOnPlatform: false,
    currentPlatform: null,
    color: '#00BFFF'
};

let platforms = [];
let depth = 0;
let lives = 5;
let keys = {};
let cameraPosY = 0;
let spawnDepth = 0;
let difficulty = 1;

// 初始化游戏
function initGame() {
    // 重置游戏状态
    player = {
        x: canvas.width / 2 - PLAYER_WIDTH / 2,
        y: 100,
        width: PLAYER_WIDTH,
        height: PLAYER_HEIGHT,
        velocityY: 0,
        velocityX: 0,
        isJumping: false,
        isOnPlatform: false,
        currentPlatform: null,
        color: '#00BFFF'
    };

    platforms = [];
    depth = 0;
    lives = 5;
    cameraPosY = 0;
    spawnDepth = 0;
    difficulty = 1;

    // 更新UI
    updateUI();

    // 创建初始平台
    createInitialPlatforms();
}

// 创建初始平台
function createInitialPlatforms() {
    // 第一个平台直接放在玩家下方
    platforms.push({
        x: canvas.width / 2 - PLATFORM_WIDTH / 2,
        y: player.y + player.height + 10,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type: PLATFORM_TYPES.NORMAL,
        color: '#8BC34A',
        breaking: false,
        direction: 1,
        speed: 1
    });

    // 创建其他平台
    for (let i = 1; i < MAX_PLATFORMS; i++) {
        createPlatform(player.y + player.height + 10 + i * PLATFORM_GAP);
    }
}

// 创建平台
function createPlatform(y) {
    if (!gameRunning) return;

    const x = Math.random() * (canvas.width - PLATFORM_WIDTH);
    let type = PLATFORM_TYPES.NORMAL;
    let color = '#8BC34A';

    // 根据深度增加难度
    if (depth > 500) {
        const rand = Math.random();
        if (rand < 0.1 * difficulty) {
            type = PLATFORM_TYPES.SPIKE;
            color = '#F44336';
        } else if (rand < 0.3 * difficulty) {
            type = PLATFORM_TYPES.BREAKING;
            color = '#FFC107';
        } else if (rand < 0.5 * difficulty) {
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        }
    } else if (depth > 200) {
        const rand = Math.random();
        if (rand < 0.05 * difficulty) {
            type = PLATFORM_TYPES.SPIKE;
            color = '#F44336';
        } else if (rand < 0.15 * difficulty) {
            type = PLATFORM_TYPES.BREAKING;
            color = '#FFC107';
        } else if (rand < 0.3 * difficulty) {
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        }
    } else if (depth > 100) {
        const rand = Math.random();
        if (rand < 0.2 * difficulty) {
            type = PLATFORM_TYPES.MOVING;
            color = '#9C27B0';
        }
    }

    platforms.push({
        x,
        y,
        width: PLATFORM_WIDTH,
        height: PLATFORM_HEIGHT,
        type,
        color,
        breaking: false,
        direction: Math.random() > 0.5 ? 1 : -1,
        speed: Math.random() * 2 + 1
    });
}

// 更新UI
function updateUI() {
    depthElement.textContent = Math.floor(depth);
    livesElement.textContent = lives;
}

// 游戏主循环
function gameLoop() {
    if (!gameRunning) return;

    // 清空画布
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // 更新游戏状态
    updateGame();

    // 绘制游戏元素
    drawGame();

    // 继续循环
    requestAnimationFrame(gameLoop);
}

// 更新游戏状态
function updateGame() {
    // 移动玩家
    movePlayer();

    // 应用重力
    applyGravity();

    // 更新平台
    updatePlatforms();

    // 检测碰撞
    checkCollisions();

    // 移除屏幕外的平台并创建新平台
    managePlatforms();

    // 更新深度
    if (player.y > depth) {
        depth = player.y;
    }

    // 更新难度
    difficulty = 1 + depth / 1000;

    // 更新UI
    updateUI();

    // 检查游戏是否结束
    checkGameOver();
}

// 应用重力
function applyGravity() {
    if (!player.isOnPlatform) {
        player.velocityY += GRAVITY;
    }
    player.y += player.velocityY;
}

// 移动玩家
function movePlayer() {
    // 键盘控制
    if (keys.ArrowLeft || keys.a || keys.A) {
        player.velocityX = -5;
    } else if (keys.ArrowRight || keys.d || keys.D) {
        player.velocityX = 5;
    } else {
        player.velocityX = 0;
    }

    // 更新玩家位置
    player.x += player.velocityX;

    // 限制玩家在屏幕内
    if (player.x < 0) {
        player.x = 0;
    } else if (player.x > canvas.width - player.width) {
        player.x = canvas.width - player.width;
    }

    // 如果玩家在平台上，跟随平台移动
    if (player.isOnPlatform && player.currentPlatform.type === PLATFORM_TYPES.MOVING) {
        player.x += player.currentPlatform.direction * player.currentPlatform.speed;

        // 确保玩家不会移出屏幕
        if (player.x < 0) {
            player.x = 0;
        } else if (player.x > canvas.width - player.width) {
            player.x = canvas.width - player.width;
        }
    }
}

// 更新平台
function updatePlatforms() {
    for (let platform of platforms) {
        // 移动平台
        if (platform.type === PLATFORM_TYPES.MOVING) {
            platform.x += platform.direction * platform.speed;

            // 碰到边界就改变方向
            if (platform.x <= 0 || platform.x + platform.width >= canvas.width) {
                platform.direction *= -1;
            }
        }

        // 如果是破碎平台并且玩家站在上面，开始破碎倒计时
        if (platform.type === PLATFORM_TYPES.BREAKING && player.isOnPlatform && player.currentPlatform === platform && !platform.breaking) {
            platform.breaking = true;
            platform.breakTime = 30; // 破碎倒计时帧数
        }

        // 更新破碎平台倒计时
        if (platform.breaking) {
            platform.breakTime--;
            if (platform.breakTime <= 0) {
                // 平台消失
                const index = platforms.indexOf(platform);
                if (index !== -1) {
                    platforms.splice(index, 1);
                }
                // 如果玩家还在这个平台上，让玩家掉落
                if (player.currentPlatform === platform) {
                    player.isOnPlatform = false;
                    player.currentPlatform = null;
                }
            }
        }
    }
}

// 检测碰撞
function checkCollisions() {
    // 之前是否在平台上
    const wasOnPlatform = player.isOnPlatform;

    // 重置平台状态
    player.isOnPlatform = false;
    player.currentPlatform = null;

    // 只有当玩家在下落时检测碰撞
    if (player.velocityY > 0) {
        for (let platform of platforms) {
            // 检查玩家是否站在平台上
            if (
                player.x + player.width > platform.x &&
                player.x < platform.x + platform.width &&
                player.y + player.height >= platform.y &&
                player.y + player.height <= platform.y + platform.height
            ) {
                if (platform.type === PLATFORM_TYPES.SPIKE) {
                    // 玩家碰到尖刺平台，减少生命
                    loseLife();
                } else {
                    // 玩家站在普通平台上
                    player.isOnPlatform = true;
                    player.currentPlatform = platform;
                    player.y = platform.y - player.height;

                    // 如果是第一次站上这个平台，给予跳跃力
                    if (!wasOnPlatform) {
                        player.velocityY = JUMP_POWER;
                    }
                }
            }
        }
    }
}

// 管理平台（移除屏幕外的并创建新的）
function managePlatforms() {
    // 计算相对于相机的y坐标
    const cameraY = player.y - canvas.height / 3;
    cameraPosY = Math.max(cameraPosY, cameraY);

    // 移除屏幕上方的平台
    platforms = platforms.filter(platform => platform.y > cameraPosY - 100);

    // 在屏幕下方创建新平台
    if (spawnDepth < cameraPosY + canvas.height) {
        createPlatform(spawnDepth + PLATFORM_GAP);
        spawnDepth += PLATFORM_GAP;
    }

    // 保持平台数量适中
    while (platforms.length < MAX_PLATFORMS) {
        createPlatform(spawnDepth);
        spawnDepth += PLATFORM_GAP;
    }
}

// 减少生命
function loseLife() {
    lives--;
    if (lives > 0) {
        // 玩家受伤，短暂无敌并弹跳
        player.velocityY = JUMP_POWER * 1.2;
        player.isOnPlatform = false;
        player.currentPlatform = null;
        player.color = '#FF6B6B'; // 受伤变红

        // 短暂变红后恢复
        setTimeout(() => {
            player.color = '#00BFFF';
        }, 500);
    }
}

// 检查游戏是否结束
function checkGameOver() {
    // 如果玩家掉出屏幕顶部或生命耗尽
    if (player.y < cameraPosY - 100 || lives <= 0) {
        endGame();
    }
}

// 结束游戏
function endGame() {
    gameRunning = false;
    finalDepthElement.textContent = Math.floor(depth);
    gameOverElement.style.display = 'block';
    restartButton.style.display = 'block';
    startButton.style.display = 'none';
}

// 绘制游戏
function drawGame() {
    // 计算相对于相机的y坐标
    const cameraY = player.y - canvas.height / 3;
    cameraPosY = Math.max(cameraPosY, cameraY);

    // 绘制背景
    drawBackground();

    // 绘制平台
    drawPlatforms();

    // 绘制玩家
    drawPlayer();
}

// 绘制背景
function drawBackground() {
    // 纯色背景
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // 每100米绘制深度标记
    for (let d = Math.floor(cameraPosY / 100) * 100; d <= cameraPosY + canvas.height; d += 100) {
        const y = canvas.height - (d - cameraPosY);
        ctx.fillStyle = '#333';
        ctx.fillRect(0, y, canvas.width, 1);

        ctx.fillStyle = '#777';
        ctx.font = '12px Arial';
        ctx.fillText(`${d}m`, 5, y - 5);
    }
}

// 绘制平台
function drawPlatforms() {
    for (let platform of platforms) {
        // 计算相对于相机的y坐标
        const y = canvas.height - (platform.y - cameraPosY);

        // 如果平台在视野内才绘制
        if (y >= -platform.height && y <= canvas.height) {
            // 绘制平台
            ctx.fillStyle = platform.color;

            // 如果是破碎平台且正在破碎，闪烁效果
            if (platform.breaking && platform.breakTime % 5 === 0) {
                ctx.fillStyle = '#FF6B6B';
            }

            ctx.fillRect(platform.x, y - platform.height, platform.width, platform.height);

            // 如果是尖刺平台，绘制尖刺
            if (platform.type === PLATFORM_TYPES.SPIKE) {
                ctx.fillStyle = '#F44336';
                for (let i = 0; i < platform.width - 10; i += 10) {
                    ctx.beginPath();
                    ctx.moveTo(platform.x + i + 5, y - platform.height - 10);
                    ctx.lineTo(platform.x + i + 10, y - platform.height);
                    ctx.lineTo(platform.x + i, y - platform.height);
                    ctx.fill();
                }
            }
        }
    }
}

// 绘制玩家
function drawPlayer() {
    // 计算相对于相机的y坐标
    const y = canvas.height - (player.y - cameraPosY);

    // 绘制玩家
    ctx.fillStyle = player.color;
    ctx.fillRect(player.x, y - player.height, player.width, player.height);

    // 绘制眼睛和微笑
    ctx.fillStyle = '#000';
    ctx.fillRect(player.x + 5, y - player.height + 8, 5, 5);
    ctx.fillRect(player.x + player.width - 10, y - player.height + 8, 5, 5);

    if (player.velocityY > 0) {
        // 下落表情
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, y - player.height + 25, 5, 0, Math.PI, false);
        ctx.stroke();
    } else {
        // 上升表情
        ctx.beginPath();
        ctx.arc(player.x + player.width / 2, y - player.height + 20, 5, 0, Math.PI, true);
        ctx.stroke();
    }
}

// 开始游戏
function startGame() {
    if (gameRunning) return;

    gameRunning = true;
    gameOverElement.style.display = 'none';
    startButton.style.display = 'none';
    restartButton.style.display = 'block';

    initGame();
    gameLoop();
}

// 重启游戏
function restartGame() {
    if (gameRunning) return;

    gameRunning = true;
    gameOverElement.style.display = 'none';

    initGame();
    gameLoop();
}

// 事件监听
startButton.addEventListener('click', startGame);
restartButton.addEventListener('click', restartGame);
tryAgainButton.addEventListener('click', restartGame);

// 键盘控制
window.addEventListener('keydown', (e) => {
    keys[e.key] = true;
});

window.addEventListener('keyup', (e) => {
    keys[e.key] = false;
});

// 移动设备触摸控制
leftButton.addEventListener('touchstart', () => { keys.ArrowLeft = true; });
leftButton.addEventListener('touchend', () => { keys.ArrowLeft = false; });
rightButton.addEventListener('touchstart', () => { keys.ArrowRight = true; });
rightButton.addEventListener('touchend', () => { keys.ArrowRight = false; });

// 鼠标控制
leftButton.addEventListener('mousedown', () => { keys.ArrowLeft = true; });
leftButton.addEventListener('mouseup', () => { keys.ArrowLeft = false; });
leftButton.addEventListener('mouseleave', () => { keys.ArrowLeft = false; });
rightButton.addEventListener('mousedown', () => { keys.ArrowRight = true; });
rightButton.addEventListener('mouseup', () => { keys.ArrowRight = false; });
rightButton.addEventListener('mouseleave', () => { keys.ArrowRight = false; });

// 窗口大小调整
window.addEventListener('resize', () => {
    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;
    if (!gameRunning) {
        initGame();
        drawGame();
    }
});

// 初始化游戏但不启动
initGame();
drawGame(); 