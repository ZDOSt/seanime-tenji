import Foundation

private var failures = 0

private func rect(_ x: Double, _ y: Double, _ width: Double = 40, _ height: Double = 40) -> ExpoTVFocusRect {
  ExpoTVFocusRect(x: x, y: y, width: width, height: height)
}

private func expect(
  _ name: String,
  source: ExpoTVFocusRect,
  candidates: [ExpoTVFocusRect],
  direction: ExpoTVFocusDirection,
  index: Int?
) {
  let actual = ExpoTVFocusFinder.next(
    from: source,
    candidates: candidates,
    direction: direction
  )

  if actual != index {
    failures += 1
    print("FAIL \(name): expected \(String(describing: index)), got \(String(describing: actual))")
  }
}

private func expectGuide(
  _ name: String,
  source: ExpoTVFocusRect,
  target: ExpoTVFocusRect,
  direction: ExpoTVFocusDirection,
  expected: ExpoTVFocusRect
) {
  let actual = ExpoTVFocusFinder.guide(
    from: source,
    to: target,
    direction: direction
  )

  if actual != expected {
    failures += 1
    print("FAIL \(name): expected \(expected), got \(actual)")
  }
}

let source = rect(100, 100)

expect(
  "returns nil without a directional candidate",
  source: source,
  candidates: [rect(100, 160)],
  direction: .up,
  index: nil
)

expect(
  "accepts a diagonal candidate",
  source: source,
  candidates: [rect(0, 0)],
  direction: .up,
  index: 0
)

expect(
  "prefers in-beam horizontal candidate",
  source: source,
  candidates: [rect(0, 100), rect(70, 20)],
  direction: .left,
  index: 0
)

expect(
  "uses weighted distance outside the beam",
  source: source,
  candidates: [rect(20, 60), rect(50, 0)],
  direction: .up,
  index: 0
)

expect(
  "finds the nearest candidate to the right",
  source: source,
  candidates: [rect(240, 100), rect(160, 100)],
  direction: .right,
  index: 1
)

expect(
  "finds the nearest candidate below",
  source: source,
  candidates: [rect(100, 220), rect(100, 160)],
  direction: .down,
  index: 1
)

expect(
  "allows a partially directional candidate",
  source: source,
  candidates: [rect(80, 80, 40, 40)],
  direction: .up,
  index: 0
)

expect(
  "prefers the close next row over a distant aligned row",
  source: rect(33, 341, 76, 34),
  candidates: [
    rect(114, 299, 67, 34),
    rect(35, 253, 120, 33),
  ],
  direction: .up,
  index: 0
)

expect(
  "does not leave the current row horizontally",
  source: rect(1370, 240, 150, 44),
  candidates: [
    rect(900, 115, 150, 44),
    rect(1460, 300, 110, 40),
  ],
  direction: .left,
  index: nil
)

expect(
  "enters the next row at its first item",
  source: rect(1370, 240, 150, 44),
  candidates: [
    rect(50, 300, 55, 40),
    rect(1320, 300, 90, 40),
  ],
  direction: .down,
  index: 0
)

expect(
  "enters the previous row at its first item",
  source: rect(1370, 240, 150, 44),
  candidates: [
    rect(80, 120, 150, 44),
    rect(420, 120, 130, 44),
  ],
  direction: .up,
  index: 0
)

expectGuide(
  "places up guide beside the source",
  source: rect(100, 100),
  target: rect(20, 20),
  direction: .up,
  expected: ExpoTVFocusRect(left: 20, top: 99, right: 140, bottom: 100)
)

expectGuide(
  "places down guide beside the source",
  source: rect(100, 100),
  target: rect(220, 220),
  direction: .down,
  expected: ExpoTVFocusRect(left: 100, top: 140, right: 260, bottom: 141)
)

expectGuide(
  "places left guide beside the source",
  source: rect(100, 100),
  target: rect(20, 20),
  direction: .left,
  expected: ExpoTVFocusRect(left: 99, top: 20, right: 100, bottom: 140)
)

expectGuide(
  "places right guide beside the source",
  source: rect(100, 100),
  target: rect(220, 220),
  direction: .right,
  expected: ExpoTVFocusRect(left: 140, top: 100, right: 141, bottom: 260)
)

if failures > 0 {
  exit(1)
}

print("booyah")
