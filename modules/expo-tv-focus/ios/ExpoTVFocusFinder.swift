import Foundation

// Source: frameworks/base/core/java/android/view/FocusFinder.java
// Android Open Source Project, Apache License 2.0.

enum ExpoTVFocusDirection: CaseIterable, Hashable {
  case up
  case down
  case left
  case right
}

struct ExpoTVFocusRect: Equatable {
  let left: Double
  let top: Double
  let right: Double
  let bottom: Double

  init(left: Double, top: Double, right: Double, bottom: Double) {
    self.left = left
    self.top = top
    self.right = right
    self.bottom = bottom
  }

  init(x: Double, y: Double, width: Double, height: Double) {
    self.init(left: x, top: y, right: x + width, bottom: y + height)
  }

  var width: Double {
    right - left
  }

  var height: Double {
    bottom - top
  }

  var centerX: Double {
    left + width / 2
  }

  var centerY: Double {
    top + height / 2
  }
}

enum ExpoTVFocusFinder {
  static func guide(
    from source: ExpoTVFocusRect,
    to target: ExpoTVFocusRect,
    direction: ExpoTVFocusDirection
  ) -> ExpoTVFocusRect {
    switch direction {
    case .up:
      return ExpoTVFocusRect(
        left: min(source.left, target.left),
        top: source.top - 1,
        right: max(source.right, target.right),
        bottom: source.top
      )
    case .down:
      return ExpoTVFocusRect(
        left: min(source.left, target.left),
        top: source.bottom,
        right: max(source.right, target.right),
        bottom: source.bottom + 1
      )
    case .left:
      return ExpoTVFocusRect(
        left: source.left - 1,
        top: min(source.top, target.top),
        right: source.left,
        bottom: max(source.bottom, target.bottom)
      )
    case .right:
      return ExpoTVFocusRect(
        left: source.right,
        top: min(source.top, target.top),
        right: source.right + 1,
        bottom: max(source.bottom, target.bottom)
      )
    }
  }

  static func next(
    from source: ExpoTVFocusRect,
    candidates: [ExpoTVFocusRect],
    direction: ExpoTVFocusDirection
  ) -> Int? {
    let rows = makeRows(source: source, candidates: candidates)
    guard let sourceRow = rows.firstIndex(where: { row in
      row.contains { $0.index == nil }
    }) else {
      return nil
    }

    switch direction {
    case .left, .right:
      let row = rows[sourceRow]
      let entries = row.filter { $0.index != nil }
      let index = best(
        from: source,
        candidates: entries.map(\.rect),
        direction: direction
      )
      return index.flatMap { entries[$0].index }

    case .up:
      guard sourceRow > rows.startIndex else {
        return nil
      }
      return first(in: rows[rows.index(before: sourceRow)])

    case .down:
      let row = rows.index(after: sourceRow)
      guard row < rows.endIndex else {
        return nil
      }
      return first(in: rows[row])
    }
  }

  private struct Entry {
    let index: Int?
    let rect: ExpoTVFocusRect
  }

  private static func makeRows(
    source: ExpoTVFocusRect,
    candidates: [ExpoTVFocusRect]
  ) -> [[Entry]] {
    let entries = [Entry(index: nil, rect: source)]
      + candidates.enumerated().map { Entry(index: $0.offset, rect: $0.element) }

    let sorted = entries.sorted {
      if $0.rect.centerY == $1.rect.centerY {
        return $0.rect.left < $1.rect.left
      }
      return $0.rect.centerY < $1.rect.centerY
    }

    var rows: [[Entry]] = []
    for entry in sorted {
      guard var row = rows.popLast() else {
        rows.append([entry])
        continue
      }

      let anchor = row[0].rect
      let gap = abs(entry.rect.centerY - anchor.centerY)
      let limit = min(entry.rect.height, anchor.height) / 2

      if gap < limit {
        row.append(entry)
        rows.append(row)
      } else {
        rows.append(row)
        rows.append([entry])
      }
    }

    return rows
  }

  private static func first(in row: [Entry]) -> Int? {
    row
      .filter { $0.index != nil }
      .min { $0.rect.left < $1.rect.left }?
      .index
  }

  private static func best(
    from source: ExpoTVFocusRect,
    candidates: [ExpoTVFocusRect],
    direction: ExpoTVFocusDirection
  ) -> Int? {
    var bestIndex: Int?
    var bestRect: ExpoTVFocusRect?

    for (index, rect) in candidates.enumerated() {
      guard isCandidate(source, rect, direction) else {
        continue
      }

      guard let currentBest = bestRect else {
        bestIndex = index
        bestRect = rect
        continue
      }

      if isBetter(source, rect, than: currentBest, direction) {
        bestIndex = index
        bestRect = rect
      }
    }

    return bestIndex
  }

  static func isBetter(
    _ source: ExpoTVFocusRect,
    _ first: ExpoTVFocusRect,
    than second: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Bool {
    guard isCandidate(source, first, direction) else {
      return false
    }

    guard isCandidate(source, second, direction) else {
      return true
    }

    if beamBeats(source, first, second, direction) {
      return true
    }

    if beamBeats(source, second, first, direction) {
      return false
    }

    return score(source, first, direction) < score(source, second, direction)
  }

  static func isCandidate(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Bool {
    switch direction {
    case .left:
      return (source.right > destination.right || source.left >= destination.right)
        && source.left > destination.left
    case .right:
      return (source.left < destination.left || source.right <= destination.left)
        && source.right < destination.right
    case .up:
      return (source.bottom > destination.bottom || source.top >= destination.bottom)
        && source.top > destination.top
    case .down:
      return (source.top < destination.top || source.bottom <= destination.top)
        && source.bottom < destination.bottom
    }
  }

  private static func beamBeats(
    _ source: ExpoTVFocusRect,
    _ first: ExpoTVFocusRect,
    _ second: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Bool {
    let firstInBeam = beamsOverlap(source, first, direction)
    let secondInBeam = beamsOverlap(source, second, direction)

    if secondInBeam || !firstInBeam {
      return false
    }

    if !isToDirection(source, second, direction) {
      return true
    }

    if direction == .left || direction == .right {
      return true
    }

    return majorDistance(source, first, direction)
      < majorFarDistance(source, second, direction)
  }

  private static func beamsOverlap(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Bool {
    switch direction {
    case .left, .right:
      return destination.bottom > source.top && destination.top < source.bottom
    case .up, .down:
      return destination.right > source.left && destination.left < source.right
    }
  }

  private static func isToDirection(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Bool {
    switch direction {
    case .left:
      return source.left >= destination.right
    case .right:
      return source.right <= destination.left
    case .up:
      return source.top >= destination.bottom
    case .down:
      return source.bottom <= destination.top
    }
  }

  private static func score(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    let major = majorDistance(source, destination, direction)
    let minor = minorDistance(source, destination, direction)
    return 13 * major * major + minor * minor
  }

  private static func majorDistance(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    max(0, majorDistanceRaw(source, destination, direction))
  }

  private static func majorDistanceRaw(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    switch direction {
    case .left:
      return source.left - destination.right
    case .right:
      return destination.left - source.right
    case .up:
      return source.top - destination.bottom
    case .down:
      return destination.top - source.bottom
    }
  }

  private static func majorFarDistance(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    max(1, majorFarDistanceRaw(source, destination, direction))
  }

  private static func majorFarDistanceRaw(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    switch direction {
    case .left:
      return source.left - destination.left
    case .right:
      return destination.right - source.right
    case .up:
      return source.top - destination.top
    case .down:
      return destination.bottom - source.bottom
    }
  }

  private static func minorDistance(
    _ source: ExpoTVFocusRect,
    _ destination: ExpoTVFocusRect,
    _ direction: ExpoTVFocusDirection
  ) -> Double {
    switch direction {
    case .left, .right:
      return abs(source.centerY - destination.centerY)
    case .up, .down:
      return abs(source.centerX - destination.centerX)
    }
  }
}
