import ExpoModulesCore

public final class ExpoTVFocusModule: Module {
#if os(tvOS)
  private let resolver = ExpoTVFocusResolver()
#endif

  public func definition() -> ModuleDefinition {
    Name("ExpoTVFocus")

    Events("onTrace")

    OnCreate {
#if os(tvOS)
      self.resolver.onTrace = { [weak self] message in
        self?.sendEvent("onTrace", ["message": message])
      }
#endif
    }

    OnDestroy {
#if os(tvOS)
      self.resolver.onTrace = nil
#endif
    }

    AsyncFunction("setEnabled") { (enabled: Bool) in
#if os(tvOS)
      self.resolver.setEnabled(enabled)
#endif
    }
    .runOnQueue(.main)
  }
}
