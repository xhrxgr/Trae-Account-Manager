# 实例管理（Instance Management）设计文档

**日期**: 2026-07-11
**版本**: v1.0.8
**状态**: 已确认，待实现

## 背景与目标

当前应用以「账号」为中心：Account 持有可选的 `data_dir` 字段表示多开目录。用户希望转向「实例」为中心的管理模式——先创建实例（独立 data-dir 的工作环境），再绑定账号，支持实例的启动、重命名、磁盘占用展示、打开数据目录、创建桌面快捷方式等操作。

**核心目标**：实例成为一等实体，账号退为"令牌仓库"。实例管理作为应用首页。

## 架构：独立 InstanceStore（方案 A）

新建 `instances.json` 存储实例，与 `accounts.json` 分离。

- **实例**：持久化的 data-dir 工作环境，绑定一个当前账号，可一键切换
- **账号**：身份凭证（Token、用户信息），可被多个实例复用
- **关系**：1 账号 → 多实例（同一账号可绑到多个实例）；1 实例 → 1 当前账号

选择此方案的原因：实例和账号是不同生命周期的实体，分开存储职责清晰，删除实例不影响账号，支持账号复用。

## 数据模型

### TraeInstance 结构

```rust
// src-tauri/src/instance/types.rs
pub struct TraeInstance {
    pub id: String,                         // 实例唯一 ID
    pub name: String,                       // 用户自定义名称，如 "工作实例"
    pub data_dir: String,                   // 绝对路径
    pub is_default: bool,                   // 是否为默认实例（指向 %APPDATA%\TRAE SOLO CN）
    pub bound_account_id: Option<String>,   // 当前绑定的账号 ID（None=未绑定）
    pub machine_id: Option<String>,         // 该实例的机器码（None=首次启动时生成）
    pub created_at: i64,
    pub updated_at: i64,
}

pub struct InstanceStore {
    pub instances: Vec<TraeInstance>,
    // 无 active/current 字段——实例是并行的，无"当前"概念
}
```

### Account 结构调整

移除 `Account.data_dir: Option<String>` 字段（迁移到 Instance）。Account 回归纯凭证职责。

### 存储文件

- `accounts.json` - 账号凭证（Token、用户信息）
- `instances.json` - 实例配置（data_dir、绑定关系、机器码）

### 迁移逻辑（首次启动 v1.0.8）

1. 创建 `instances.json`，生成"默认实例"（`is_default=true`, `data_dir=%APPDATA%\TRAE SOLO CN`）
2. 遍历 `accounts.json`，对每个有 `data_dir` 的账号：创建一个新实例，`bound_account_id=该账号id`，`data_dir=Account.data_dir`
3. 清除 `Account.data_dir` 字段
4. 默认实例绑定到 `current_account_id`（如果有）

### 快捷方式命名规则

实例快捷方式名称格式：`TRAE Work CN - <实例名>.lnk`
- 默认实例：`TRAE Work CN - 默认.lnk`
- 工作实例：`TRAE Work CN - 工作实例.lnk`

图标复用 TRAE 主程序的图标（从 `TRAE SOLO CN.exe` 提取）。

## 后端模块

### 新增 instance 模块

```
src-tauri/src/instance/
├── mod.rs                # 模块入口
├── types.rs              # TraeInstance, InstanceStore
└── instance_manager.rs   # CRUD + 启动 + 快捷方式
```

### InstanceManager 方法

| 方法 | 功能 |
|------|------|
| `create_instance(name, data_dir?)` | 创建实例。data_dir=None 时自动生成 `%APPDATA%\TRAE SOLO CN_<id>` |
| `list_instances()` | 返回所有实例 + 绑定账号信息 + 磁盘占用 + 运行状态 |
| `delete_instance(id, delete_data?)` | 删除实例。默认实例不可删；delete_data=true 时连 data-dir 一起删 |
| `rename_instance(id, new_name)` | 重命名 |
| `bind_account(instance_id, account_id)` | 绑定账号（写入登录信息到该实例 data-dir） |
| `launch_instance(id)` | 启动实例（总是新开进程，运行中则提示） |
| `open_instance_data_dir(id)` | 资源管理器打开 data-dir |
| `create_instance_shortcut(id, shortcut_path?)` | 创建桌面快捷方式，图标取自 TRAE exe |
| `get_instance_disk_usage(data_dir)` | 计算目录大小 |
| `is_instance_running(data_dir)` | 读 code.lock 拿 PID，检查进程是否存活 |

### machine.rs 复用

- `launch_product_multi` 重构为 `launch_instance(instance)`，复用现有加密写入逻辑
- `open_product_with_data_dir` 直接复用
- 新增 `get_dir_size(path)` 工具函数

### Tauri 命令（lib.rs 新增）

- `create_instance`, `list_instances`, `delete_instance`, `rename_instance`
- `bind_account_to_instance`, `launch_instance`, `open_instance_data_dir`
- `create_instance_shortcut`

## 前端 UI

### 侧边栏调整

```
实例管理 (主页)  ← 新增，设为首页
账号管理         ← 降为次要，负责 Token/导入导出
设置
关于
```

### 实例管理页布局

实例卡片网格展示，每张卡片包含：
- 实例名称（默认实例有"默认"标记）
- 绑定账号（头像 + 邮箱）
- 磁盘占用（如 320MB）
- 运行状态（运行中 / 已停止）
- 启动按钮

### 实例卡片右键菜单

- ▶ 启动实例（运行中时提示"已在运行"）
- 🔀 切换账号（弹出账号选择）
- 📁 打开数据目录
- 🖔 创建桌面快捷方式
- ✏️ 重命名
- 🗑 删除（默认实例禁用）

### 创建实例弹窗

- 实例名称输入框
- 绑定账号下拉（可选，也可创建后绑）
- 初始化策略：空目录（固定）

## 数据流

### 启动实例流程

1. 用户点"启动"
2. 检查 code.lock PID 是否存活
   - 存活: toast 提示"实例已在运行"，仍启动新进程（用户选择总是新开）
3. 读取 bound_account_id
   - 有绑定: 写入加密登录信息到 data-dir/storage.json → 启动
   - 无绑定: 直接启动（用户在 TRAE 内手动登录）
4. 启动: `TRAE SOLO CN.exe --user-data-dir=<data_dir> --extensions-dir=<shared>`
5. 刷新实例列表（状态变"运行中"）

### 切换账号流程

1. 用户右键"切换账号" → 选账号
2. 不杀进程（实例可能在运行，切换只改绑定 + 写 storage.json）
3. 更新 instance.bound_account_id
4. 写入新账号加密登录信息到 data-dir/storage.json
5. toast 提示"已切换，重启实例生效"

## 错误处理与边界

- **默认实例不可删除**：UI 禁用删除按钮，后端返回错误
- **data-dir 路径冲突**：创建实例时检查路径是否已被其他实例占用
- **绑定账号 Token 过期**：启动时检测，toast 警告"Token 已过期，请先刷新"
- **data-dir 被外部删除**：`get_instance_disk_usage` 返回 0，启动时自动重建目录
- **快捷方式图标**：从 TRAE exe 提取图标，失败则用默认图标

## 打开时检测当前登录账户

应用启动时（loadInstances），对默认实例读取其 storage.json 中的 iCubeAuthInfo，解密后与 accounts.json 中的账号按 user_id 匹配，自动绑定 bound_account_id。这样用户在外部 TRAE 登录后，管理器打开时能自动识别当前登录的账号。
