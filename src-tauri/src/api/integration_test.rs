use crate::api::trae_api::TraeApiClient;
use crate::machine::decrypt_solo_cn_auth_info;
use std::fs;
use std::path::PathBuf;

/// 测试完整链路：解密 -> API 调用 -> 获取使用量
#[tokio::test]
async fn test_solo_cn_full_flow() {
    let appdata = std::env::var("APPDATA").expect("APPDATA");
    let storage_path = PathBuf::from(&appdata)
        .join("TRAE SOLO CN")
        .join("User")
        .join("globalStorage")
        .join("storage.json");

    if !storage_path.exists() {
        eprintln!("storage.json 不存在，跳过测试");
        return;
    }

    let content = fs::read_to_string(&storage_path).expect("读取 storage.json");
    let storage: serde_json::Value = serde_json::from_str(&content).expect("解析 storage.json");

    // 1. 解密认证信息
    let encrypted = storage
        .get("iCubeAuthInfo://icube.cloudide")
        .and_then(|v| v.as_str())
        .expect("未找到认证信息");

    let decrypted = decrypt_solo_cn_auth_info(encrypted).expect("解密失败");
    let auth: serde_json::Value = serde_json::from_str(&decrypted).expect("JSON 解析失败");

    let token = auth["token"].as_str().expect("未找到 Token");
    let user_id = auth["userId"].as_str().expect("未找到 userId");
    println!("[TEST] 解密成功! UserID: {}", user_id);

    // 2. 使用 CN API 客户端获取用户信息
    let client = TraeApiClient::new_with_token(token).expect("创建 API 客户端失败");
    let user_info = client.get_user_info_by_token().await.expect("获取用户信息失败");
    println!("[TEST] 获取用户信息成功! UserID: {}, ScreenName: {:?}",
        user_info.user_id, user_info.screen_name);

    // 3. 获取使用量（含 CN 免费额度）
    let usage = client.get_usage_summary_by_token().await.expect("获取使用量失败");
    println!("[TEST] ========== CN 免费额度信息 ==========");
    println!("[TEST] 计划: {} (is_cn={}, is_free_plan={})",
        usage.plan_display_desc, usage.is_cn, usage.is_free_plan);
    println!("[TEST] 快速请求: {}/{} (剩余: {})",
        usage.fast_request_used, usage.fast_request_limit, usage.fast_request_left);
    println!("[TEST] 慢速请求: {}/{} (剩余: {})",
        usage.slow_request_used, usage.slow_request_limit, usage.slow_request_left);
    println!("[TEST] 高级模型: {}/{} (剩余: {})",
        usage.advanced_model_used, usage.advanced_model_limit, usage.advanced_model_left);
    println!("[TEST] 代码补全: {}/{} (剩余: {})",
        usage.autocomplete_used, usage.autocomplete_limit, usage.autocomplete_left);
    println!("[TEST] 额外礼包: {}/{} (剩余: {}, 名称: '{}')",
        usage.extra_fast_request_used, usage.extra_fast_request_limit,
        usage.extra_fast_request_left, usage.extra_package_name);
    println!("[TEST] 并行任务数: {}", usage.solo_agent_parallel_limit);
    println!("[TEST] 付费新人: {}, 可试用: {}, 试用中: {}, 试用结束: {}",
        usage.is_pay_freshman, usage.is_trial_eligible,
        usage.is_in_trial, usage.trial_end_time);
    println!("[TEST] 完整链路测试通过!");
}