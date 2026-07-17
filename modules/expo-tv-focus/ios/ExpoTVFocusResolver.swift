import UIKit

#if os(tvOS)
final class ExpoTVFocusResolver {
  var onTrace: ((String) -> Void)?

  private struct Item {
    weak var view: UIView?
    let rect: ExpoTVFocusRect
  }

  private struct Guide {
    weak var host: UIView?
    let value: UIFocusGuide
    let constraints: [NSLayoutConstraint]
  }

  private struct Target {
    weak var view: UIView?
  }

  private var observers: [NSObjectProtocol] = []
  private var scrollWatches: [NSKeyValueObservation] = []
  private var scrollIDs: [ObjectIdentifier] = []
  private var guides: [Guide] = []
  private var targets: [ExpoTVFocusDirection: Target] = [:]
  private weak var currentSource: UIView?
  private var refreshPending = false
  private var lastPlan = ""
  private(set) var isEnabled = false

  deinit {
    stop()
  }

  func setEnabled(_ enabled: Bool) {
    guard enabled != isEnabled else {
      return
    }

    isEnabled = enabled

    if enabled {
      start()
      if let view = focusedView() {
        rebuild(from: view)
      }
    } else {
      stop()
    }
  }

  private func start() {
    guard observers.isEmpty else {
      return
    }

    let changed = NotificationCenter.default.addObserver(
      forName: UIFocusSystem.didUpdateNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.focusChanged(notification)
    }

    let failed = NotificationCenter.default.addObserver(
      forName: UIFocusSystem.movementDidFailNotification,
      object: nil,
      queue: .main
    ) { [weak self] notification in
      self?.focusFailed(notification)
    }

    observers = [changed, failed]
  }

  private func stop() {
    for observer in observers {
      NotificationCenter.default.removeObserver(observer)
    }
    observers.removeAll()

    reset()
  }

  private func focusChanged(_ notification: Notification) {
    guard
      isEnabled,
      let context = notification.userInfo?[UIFocusSystem.focusUpdateContextUserInfoKey]
        as? UIFocusUpdateContext
    else {
      reset()
      return
    }

    traceUpdate(context)

    guard let view = context.nextFocusedView else {
      reset()
      return
    }

    rebuild(from: view)
  }

  private func focusFailed(_ notification: Notification) {
    if
      isEnabled,
      let context = notification.userInfo?[UIFocusSystem.focusUpdateContextUserInfoKey]
        as? UIFocusUpdateContext
    {
      traceFailure(context)
    }

    guard
      isEnabled,
      let context = notification.userInfo?[UIFocusSystem.focusUpdateContextUserInfoKey]
        as? UIFocusUpdateContext,
      let source = context.previouslyFocusedItem as? UIView,
      source === currentSource,
      let direction = focusDirection(context.focusHeading),
      let target = targets[direction]?.view,
      target.window === source.window,
      target.canBecomeFocused,
      let root = focusRoot(for: source)
    else {
      return
    }

    reveal(target, in: root)
    DispatchQueue.main.async { [weak self, weak target] in
      guard let self, let target, target.window != nil else {
        return
      }
      self.requestFocus(target, in: root)
    }
  }

  private func rebuild(from source: UIView) {
    removeGuides()
    targets.removeAll()
    currentSource = source

    guard
      isEnabled,
      source.window != nil,
      source.canBecomeFocused,
      let root = focusRoot(for: source)
    else {
      unwatchScroll()
      return
    }

    let sourceFrame = source.convert(source.bounds, to: root)
    guard sourceFrame.width > 0, sourceFrame.height > 0 else {
      unwatchScroll()
      return
    }

    let sourceRect = focusRect(sourceFrame)
    let scopes = focusScopes(from: source, root: root)
    watchScroll(scopes)

    for direction in ExpoTVFocusDirection.allCases {
      var next: Item?

      for scope in scopes {
        let items = focusItems(
          in: scope,
          root: root,
          excluding: source
        )
        let rects = items.map(\.rect)
        guard let index = ExpoTVFocusFinder.next(
          from: sourceRect,
          candidates: rects,
          direction: direction
        ) else {
          continue
        }

        next = items[index]
        break
      }

      guard
        let next,
        let target = next.view,
        target.window === source.window,
        target.canBecomeFocused
      else {
        addBlocker(direction: direction, from: source, in: root)
        continue
      }

      targets[direction] = Target(view: target)
      addGuide(
        direction: direction,
        from: source,
        to: target,
        in: root
      )
    }

    tracePlan(source)
  }

  private func focusScopes(from source: UIView, root: UIView) -> [UIView] {
    var scopes: [UIView] = []
    var parent = source.superview

    while let view = parent {
      if view is UIScrollView {
        scopes.append(view)
      }
      if view === root {
        break
      }
      parent = view.superview
    }

    if !scopes.contains(where: { $0 === root }) {
      scopes.append(root)
    }

    return scopes
  }

  private func focusRoot(for source: UIView) -> UIView? {
    guard let window = source.window else {
      return nil
    }

    var controller = window.rootViewController
    while
      let presented = controller?.presentedViewController,
      !presented.isBeingDismissed
    {
      controller = presented
    }

    if
      let view = controller?.view,
      source === view || source.isDescendant(of: view)
    {
      return view
    }

    return window
  }

  private func focusItems(
    in scope: UIView,
    root: UIView,
    excluding source: UIView
  ) -> [Item] {
    guard let window = source.window else {
      return []
    }

    var items: [Item] = []
    collect(
      scope,
      root: root,
      window: window,
      excluding: source,
      items: &items
    )
    return items
  }

  private func collect(
    _ view: UIView,
    root: UIView,
    window: UIWindow,
    excluding source: UIView,
    items: inout [Item]
  ) {
    guard
      !view.isHidden,
      view.alpha > 0.01,
      view.window === window
    else {
      return
    }

    if
      view !== source,
      view.isUserInteractionEnabled,
      view.canBecomeFocused,
      view.bounds.width > 0,
      view.bounds.height > 0
    {
      let frame = view.convert(view.bounds, to: root)
      if frame.isFinite {
        items.append(Item(view: view, rect: focusRect(frame)))
      }
    }

    for child in view.subviews {
      collect(
        child,
        root: root,
        window: window,
        excluding: source,
        items: &items
      )
    }
  }

  private func addGuide(
    direction: ExpoTVFocusDirection,
    from source: UIView,
    to target: UIView,
    in host: UIView
  ) {
    let sourceFrame = source.convert(source.bounds, to: host)
    let targetFrame = target.convert(target.bounds, to: host)
    guard sourceFrame.isFinite, targetFrame.isFinite else {
      return
    }

    let frame = ExpoTVFocusFinder.guide(
      from: focusRect(sourceFrame),
      to: focusRect(targetFrame),
      direction: direction
    )

    let guide = UIFocusGuide()
    guide.preferredFocusEnvironments = [target]
    host.addLayoutGuide(guide)

    let constraints = [
      guide.leftAnchor.constraint(
        equalTo: host.leftAnchor,
        constant: CGFloat(frame.left) - host.bounds.minX
      ),
      guide.topAnchor.constraint(
        equalTo: host.topAnchor,
        constant: CGFloat(frame.top) - host.bounds.minY
      ),
      guide.widthAnchor.constraint(equalToConstant: CGFloat(frame.width)),
      guide.heightAnchor.constraint(equalToConstant: CGFloat(frame.height)),
    ]

    NSLayoutConstraint.activate(constraints)
    guides.append(Guide(host: host, value: guide, constraints: constraints))
  }

  private func addBlocker(
    direction: ExpoTVFocusDirection,
    from source: UIView,
    in host: UIView
  ) {
    addGuide(
      direction: direction,
      from: source,
      to: source,
      in: host
    )
  }

  private func reveal(_ target: UIView, in root: UIView) {
    var parent = target.superview

    while let view = parent {
      if let scroll = view as? UIScrollView {
        let rect = target.convert(target.bounds, to: scroll)
        scroll.scrollRectToVisible(rect, animated: false)
        scroll.layoutIfNeeded()
      }
      if view === root {
        break
      }
      parent = view.superview
    }

    root.layoutIfNeeded()
  }

  private func requestFocus(_ target: UIView, in root: UIView) {
    let setter = NSSelectorFromString("setReactPreferredFocusedView:")
    var parent: UIView? = target

    while let view = parent {
      if view.responds(to: setter) {
        view.perform(setter, with: target)
        view.setNeedsFocusUpdate()
        view.updateFocusIfNeeded()
        view.perform(setter, with: nil)
        return
      }
      if view === root {
        break
      }
      parent = view.superview
    }
  }

  private func focusDirection(
    _ heading: UIFocusHeading
  ) -> ExpoTVFocusDirection? {
    if heading.contains(.up) {
      return .up
    }
    if heading.contains(.down) {
      return .down
    }
    if heading.contains(.left) {
      return .left
    }
    if heading.contains(.right) {
      return .right
    }
    return nil
  }

  private func watchScroll(_ scopes: [UIView]) {
    let scrolls = scopes.compactMap { $0 as? UIScrollView }
    let ids = scrolls.map(ObjectIdentifier.init)
    guard ids != scrollIDs else {
      return
    }

    unwatchScroll()
    scrollIDs = ids
    scrollWatches = scrolls.map { scroll in
      scroll.observe(\.contentOffset, options: [.new]) {
        [weak self] _, _ in
        self?.queueRefresh()
      }
    }
  }

  private func unwatchScroll() {
    for watch in scrollWatches {
      watch.invalidate()
    }
    scrollWatches.removeAll()
    scrollIDs.removeAll()
  }

  private func queueRefresh() {
    guard Thread.isMainThread else {
      DispatchQueue.main.async { [weak self] in
        self?.queueRefresh()
      }
      return
    }

    guard isEnabled, !refreshPending else {
      return
    }

    refreshPending = true
    DispatchQueue.main.async { [weak self] in
      guard let self else {
        return
      }

      self.refreshPending = false
      guard self.isEnabled, let source = self.focusedView() else {
        return
      }
      self.rebuild(from: source)
    }
  }

  private func reset() {
    refreshPending = false
    lastPlan = ""
    unwatchScroll()
    removeGuides()
    targets.removeAll()
    currentSource = nil
  }

  private func removeGuides() {
    for guide in guides {
      NSLayoutConstraint.deactivate(guide.constraints)
      guide.host?.removeLayoutGuide(guide.value)
    }
    guides.removeAll()
  }

  private func focusedView() -> UIView? {
    let windows = UIApplication.shared.connectedScenes
      .compactMap { $0 as? UIWindowScene }
      .flatMap(\.windows)
      .filter { !$0.isHidden }
      .sorted { $0.isKeyWindow && !$1.isKeyWindow }

    for window in windows {
      if
        let system = UIFocusSystem.focusSystem(for: window),
        let view = system.focusedItem as? UIView
      {
        return view
      }
    }

    return nil
  }

  private func focusRect(_ rect: CGRect) -> ExpoTVFocusRect {
    ExpoTVFocusRect(
      left: rect.minX,
      top: rect.minY,
      right: rect.maxX,
      bottom: rect.maxY
    )
  }

  private func traceUpdate(_ context: UIFocusUpdateContext) {
#if DEBUG
    trace(
      "update \(heading(context.focusHeading)) "
        + "\(name(context.previouslyFocusedItem)) -> "
        + "\(name(context.nextFocusedItem))"
    )
#endif
  }

  private func traceFailure(_ context: UIFocusUpdateContext) {
#if DEBUG
    let direction = focusDirection(context.focusHeading)
    let target = direction.flatMap { targets[$0]?.view }
    trace(
      "failed \(heading(context.focusHeading)) "
        + "from \(name(context.previouslyFocusedItem)); "
        + "planned \(name(target))"
    )
#endif
  }

  private func tracePlan(_ source: UIView) {
#if DEBUG
    let values = ExpoTVFocusDirection.allCases.map { direction in
      "\(direction)=\(name(targets[direction]?.view))"
    }
    let plan = "\(name(source)) | \(values.joined(separator: ", "))"
    guard plan != lastPlan else {
      return
    }
    lastPlan = plan
    trace("plan \(plan)")

    for direction in ExpoTVFocusDirection.allCases {
      guard let target = targets[direction]?.view else {
        continue
      }
      trace("target \(direction) \(detail(target))")
    }
#endif
  }

  private func trace(_ message: String) {
#if DEBUG
    onTrace?(message)
#endif
  }

  private func name(_ item: Any?) -> String {
    guard let item else {
      return "nil"
    }
    guard let view = item as? UIView else {
      return String(describing: type(of: item))
    }

    let label = view.accessibilityLabel?.trimmingCharacters(
      in: .whitespacesAndNewlines
    )
    let typeName = String(describing: type(of: view))
    guard let label, !label.isEmpty else {
      return typeName
    }
    return "\(typeName)[\(label)]"
  }

  private func detail(_ view: UIView) -> String {
    let frame = view.window.map {
      view.convert(view.bounds, to: $0)
    } ?? .zero
    var kids: [UIView] = []
    focusKids(view, into: &kids)

    let guides = view.layoutGuides.compactMap { $0 as? UIFocusGuide }
    let guideTargets = guides
      .map { guide in
        guide.preferredFocusEnvironments.map(name).joined(separator: ", ")
      }
      .joined(separator: "; ")

    var parents: [String] = []
    var parent = view.superview
    while let value = parent, parents.count < 6 {
      parents.append(String(describing: type(of: value)))
      parent = value.superview
    }

    let childNames = kids.prefix(6).map(name).joined(separator: "; ")
    let rect = String(
      format: "%.0f,%.0f %.0fx%.0f",
      frame.minX,
      frame.minY,
      frame.width,
      frame.height
    )

    return "\(name(view)) tag=\(view.tag) frame=\(rect) "
      + "focus=\(view.canBecomeFocused) guides=\(guides.count)"
      + "{\(guideTargets)} kids=\(kids.count){\(childNames)} "
      + "parents=\(parents.joined(separator: ">"))"
  }

  private func focusKids(_ view: UIView, into result: inout [UIView]) {
    for child in view.subviews {
      guard !child.isHidden, child.alpha > 0.01 else {
        continue
      }
      if child.canBecomeFocused {
        result.append(child)
      }
      focusKids(child, into: &result)
    }
  }

  private func heading(_ value: UIFocusHeading) -> String {
    if value.contains(.up) {
      return "up"
    }
    if value.contains(.down) {
      return "down"
    }
    if value.contains(.left) {
      return "left"
    }
    if value.contains(.right) {
      return "right"
    }
    return "none"
  }
}

private extension CGRect {
  var isFinite: Bool {
    minX.isFinite
      && minY.isFinite
      && maxX.isFinite
      && maxY.isFinite
  }
}
#endif
