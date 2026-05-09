<div align="center">

# 🚕 Robo-Cab Ottawa

### Uncertainty-Aware Navigation for Responsible Autonomous Mobility

Robo-Cab Ottawa is an interactive ethics and AI design prototype that explores how an autonomous taxi system should behave when safety evidence is incomplete. Instead of pretending to detect danger perfectly, the system makes uncertainty visible, explains low-confidence decisions, and recommends safer nearby handoff points when needed.

<br />

![React](https://img.shields.io/badge/React-18-61DAFB?style=for-the-badge&logo=react&logoColor=0B1020)
![Vite](https://img.shields.io/badge/Vite-5-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?style=for-the-badge&logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind-CSS-38BDF8?style=for-the-badge&logo=tailwindcss&logoColor=white)
![Leaflet](https://img.shields.io/badge/Leaflet-Maps-199900?style=for-the-badge&logo=leaflet&logoColor=white)
![Recharts](https://img.shields.io/badge/Recharts-Analytics-FF6384?style=for-the-badge)

<br />

[![Live Demo](https://img.shields.io/badge/Live%20Demo-GitHub%20Pages-2ea44f?style=for-the-badge&logo=github)](https://matthew-rocky.github.io/autonomous-taxi-ai-ethics-map/)
[![Repository](https://img.shields.io/badge/Source%20Code-GitHub-181717?style=for-the-badge&logo=github)](https://github.com/matthew-rocky/autonomous-taxi-ai-ethics-map)

</div>

---

## ✨ Overview

**Robo-Cab Ottawa** is a browser-based prototype for responsible autonomous mobility. It explores a simple but important question:

> What should an autonomous taxi do when it does not have enough confidence to treat a drop-off location as safe?

Most navigation systems behave as if a destination is normal unless there is strong evidence of danger. This prototype challenges that assumption. It shows how an autonomous taxi interface can make uncertainty visible, explain confidence limits, and recommend safer nearby handoff points when the system has incomplete or low-confidence information.

The project connects interface design with applied ethics methods, including **Value Mapping**, **Metaphor Hacking**, and **Social Failure Mode Analysis**.

---

## 🧠 Core Idea

Robo-Cab Ottawa does **not** claim to perfectly detect danger.

Instead, it follows this principle:

> **Do not pretend the system knows more than it knows. Make uncertainty visible, explain the decision, and choose safer behavior when confidence is low.**

When confidence is high, the system can proceed normally.  
When confidence is weak, the system should become cautious.  
When confidence is low, the system should explain the issue and suggest a safer nearby handoff.  
When the situation is critical, the system should support human review or override.

---

## 🎯 What This Prototype Demonstrates

The prototype demonstrates how an autonomous taxi system can:

- Show uncertainty instead of hiding it
- Use reports and signal data to adjust confidence
- Explain why a route is recommended or questioned
- Suggest safer nearby handoff points when needed
- Compare different confidence scenarios
- Connect interface behavior to ethical design methods
- Support accountable review through a decision brief

The goal is not to build a production safety system. The goal is to show how responsible design can change the way autonomous systems communicate uncertainty and act under incomplete information.

---

## 🧭 Demo Flow

A strong demo follows this path:

| Step | Screen | What It Shows |
|---|---|---|
| 1 | **Live Map** | The main autonomous taxi interface |
| 2 | **Pickup and Drop-off** | How a route is created |
| 3 | **Confidence Signals** | How uncertainty appears on the map |
| 4 | **Route Recommendation** | Whether the system proceeds, cautions, or suggests handoff |
| 5 | **Report Tools** | How route and area reports affect confidence |
| 6 | **Assessment** | A dashboard view of risk, confidence, reports, and ethics signals |
| 7 | **Compare** | How different scenarios change system behavior |
| 8 | **Brief** | A reviewable decision explanation |
| 9 | **Design Tools** | The ethics framework behind the prototype |

---

## 🖥️ Main Features

### 🗺️ Live Map

The Live Map is the main user-facing screen. It includes:

- Real Ottawa map interface
- Pickup and drop-off placement
- Route preview
- Confidence-aware recommendation
- Route reports
- Area reports
- Uncertainty overlays
- Safer handoff suggestions
- Marker popups
- Situation summary
- Map filters and legend

---

### 📊 Assessment

The Assessment tab summarizes the system’s confidence and ethical pressure points.

It includes:

- Scenario summary
- Destination confidence
- Number of reports
- Uncertainty overlays
- Recent signal reports
- Ottawa signal map
- Risk score
- Category breakdown
- Ethics radar chart
- Recommendation explanation

---

### 🔀 Compare

The Compare tab shows how different situations produce different system responses. It helps demonstrate that the prototype is not simply labeling places as safe or unsafe. Instead, it evaluates behavior under uncertainty.

---

### 📄 Brief

The Brief tab turns the system’s decision into a concise explanation that can be reviewed by a human operator, evaluator, or stakeholder.

---

### 🛠️ Design Tools

The Design Tools tab explains the ethics framework behind the prototype.

It includes:

- Value Map
- Metaphor Hacking
- Social Failure Mode Analysis
- Ethics priority visualization
- Confidence behavior flow

---

## 🚦 Confidence States

The prototype uses four main confidence states:

| State | Meaning | System Behavior |
|---|---|---|
| **White Confidence** | No active alert near the selected destination | Proceed normally while avoiding claims of perfect safety |
| **Orange Uncertainty** | Weak, incomplete, or unclear signal | Proceed with caution and explain uncertainty |
| **Red Confidence** | Low confidence in the exact drop-off | Recommend a safer nearby handoff |
| **Critical** | Strong clustered or severe concern | Support human review or override |

This distinction matters because a route can be technically possible while still being socially or ethically unacceptable.

---

## 🧩 Ethics Framework

## 1. Value Map

The Value Map connects stakeholders with design values.

### Stakeholders

- Tourists
- Pedestrians
- Emergency responders
- Engineers
- Technology companies

### Values

- Trust
- Accountability
- Safety
- Reliability
- Efficiency
- Reputation
- Accessibility

The central value tension is:

> **Trust vs. autopilot certainty**

A system can look confident while hiding weak evidence. Robo-Cab Ottawa treats honest uncertainty as part of trust.

---

## 2. Metaphor Hacking

The prototype uses **Metaphor Hacking** to challenge the mental model behind automated navigation.

| Old Metaphor | New Metaphor |
|---|---|
| The map behaves like an autopilot on fixed tracks. | The map behaves like a cautious human guide. |

This reframing changes the interface logic:

- Uncertainty must be visible
- Low confidence should trigger cautious behavior
- Decisions must be explained
- Safer handoff is preferred when evidence is weak

This framing is inspired by Jones and Millar’s work on hacking metaphors in the anticipatory governance of emerging technology.

---

## 3. Social Failure Mode Analysis

The prototype also uses **Social Failure Mode Analysis**.

A Robo-Cab can reach the requested destination and still fail socially if it ignores uncertainty, hides risk, or acts with false confidence.

The key failure mode in this prototype is:

> **Norm transgression**

| Dimension | Prototype Interpretation |
|---|---|
| Social context | Autonomous public transportation in a changing urban environment |
| Failure mode | Norm transgression |
| System norm | Treat a destination as normal unless explicit evidence says otherwise |
| User norm | When safety is uncertain, the system should become cautious |
| Harms | Physical risk, loss of trust, and socially unacceptable automation |
| Design response | Slow down, explain uncertainty, and recommend safer nearby handoff |

This analysis is based on Millar’s engineering perspective on social failure modes in AI systems.

---

## 🏗️ System Architecture

```text
Robo-Cab Ottawa
│
├── Live Map Interface
│   ├── Pickup and drop-off controls
│   ├── Route preview
│   ├── Area and route reporting
│   ├── Uncertainty overlays
│   └── Safer handoff suggestions
│
├── Ethics Engine
│   ├── Incident normalization
│   ├── Severity and recency weighting
│   ├── Risk zone clustering
│   ├── Confidence state assignment
│   └── Recommendation generation
│
├── Assessment Dashboard
│   ├── Scenario summary
│   ├── Risk score
│   ├── Ottawa signal map
│   ├── Category breakdown
│   └── Ethics radar
│
├── Compare View
│   └── Scenario-to-scenario behavior comparison
│
├── Decision Brief
│   └── Human-readable decision explanation
│
└── Ethics Design Toolkit
    ├── Value Map
    ├── Metaphor Hacking
    └── Social Failure Mode Analysis