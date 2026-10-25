# 技术选型记录

## 决策

- 原型：React + TypeScript + Vite，单页本地应用，无后端。
- 原生：下一阶段使用 SwiftUI + AppKit；网页不嵌入原生 App。
- 视觉：原创 SVG 猫咪；CSS 设计令牌管理浅色、深色、间距和动效。
- 测试：Playwright 驱动真实 Chromium；原生阶段再使用 Swift Testing/XCTest。

## 原因与代价

网页技术能最快验证交互和视觉，但不证明 macOS 能力。原生路线需要维护第二套视图实现，换取更自然的材质、窗口和通知行为，因此设计令牌与 PRD 才是两端的共同契约。

## 已确认的原生可行性依据

- AppKit `NSPanel` 支持透明背景、`.floating` 窗口层级、`canJoinAllSpaces` 和 `fullScreenAuxiliary`，可实现悬浮与跨桌面显示。
- 可拖动窗口背景及窗口 frame 管理能覆盖拖动、缩放、位置持久化和屏幕边界约束。
- `NSVisualEffectView`/SwiftUI 原生材质可提供磨砂；网页 `backdrop-filter` 仅是视觉参考。
- macOS UserNotifications 支持本地通知，但需要真实应用签名环境与用户授权验证。

## 当前验证边界

本机仅有 Command Line Tools，`xcodebuild` 无完整 Xcode，不能宣称原生编译或通知已通过。原生构建是独立门禁，不能由网页测试替代。

## 计时架构约束

运行中使用绝对结束时间，显示时向上取整；后台延迟后一次校正。原生版另用单调时钟防止系统时间调整影响当前运行，持久化结束时间负责跨进程恢复。界面只消费状态，不各自维护一套倒计时。
