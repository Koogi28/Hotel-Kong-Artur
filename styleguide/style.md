# Hotel Kong Arthur – Visual Style Guide

## 1. Purpose

This document defines the visual identity and frontend design guidelines for digital products developed for Hotel Kong Arthur.

The goal is to create a digital experience that feels like a natural extension of the hotel's existing website and brand.

The frontend must reflect the hotel's identity while providing a modern, intuitive and functional user experience.

**The provided screenshots are the primary visual source of truth.**

Do not introduce an unrelated visual identity or generic hotel dashboard aesthetic.

---

## 2. Brand Identity & Design Direction

Hotel Kong Arthur is a boutique hotel in central Copenhagen.

Its visual identity should communicate:

- Warmth and hospitality
- Authenticity and personality
- Classic Copenhagen character
- Comfort and relaxation
- Quality and understated elegance
- A welcoming, personal atmosphere

### Overall design direction

The interface should feel:

- Warm rather than cold
- Elegant rather than flashy
- Modern rather than futuristic
- Personal rather than corporate
- Calm rather than visually overwhelming
- Premium without feeling exclusive or intimidating

The design should balance traditional boutique hotel aesthetics with contemporary digital usability.

Avoid generic SaaS aesthetics, overly futuristic interfaces and sterile corporate dashboards.

---

## 3. Visual References

The following folders contain screenshots from Hotel Kong Arthur's existing digital presence.

### `/styleguide/screenshots/`

These screenshots must be used as visual references during frontend development.

They represent three different types of references:

**A. Homepage screenshots**
- Primary reference for brand identity.
- Reference for colors, typography, spacing and overall atmosphere.
- Reference for image treatment, visual hierarchy and layout.
- Reference for the hotel's overall visual language.

**B. Booking page screenshots**
- Reference for booking-related UI elements.
- Reference for forms, input fields, buttons and booking interactions.
- Reference for functional clarity and information hierarchy.

**C. Other endpoint screenshots**
- Reference for specific UI patterns and additional components.
- Use these to understand how different parts of the existing system are structured.
- Only adopt visual elements that are consistent with the hotel's overall brand identity.

### Screenshot interpretation rules

1. Analyze the screenshots before implementing frontend designs.
2. Identify recurring colors, typography, spacing and component styles.
3. Prioritize visual patterns that appear consistently across multiple screenshots.
4. Treat the homepage as the primary brand reference.
5. Do not blindly copy entire page layouts when developing new functionality.
6. Adapt existing design patterns to the requirements of the new system.

When screenshots contain conflicting visual patterns, prioritize the homepage's brand identity while considering the functional requirements of the specific page.

---

## 4. Color Palette

The color palette must be derived from the provided screenshots.

Do not invent an unrelated color palette.

Identify and document:

- Primary brand colors
- Secondary colors
- Background colors
- Surface and card colors
- Text colors
- Muted text colors
- Border colors
- Interactive states
- Feedback colors (success, warning and error)

Use consistent color tokens throughout the application.

Suggested token structure:

| Token | Purpose |
|---|---|
| `color-primary` | Main brand color |
| `color-secondary` | Supporting brand color |
| `color-background` | Main page background |
| `color-surface` | Cards and content surfaces |
| `color-text` | Primary text |
| `color-text-muted` | Secondary text |
| `color-border` | Dividers and borders |
| `color-success` | Success feedback |
| `color-warning` | Warning feedback |
| `color-error` | Error feedback |

Extract actual HEX values from the screenshots before finalizing the implementation.

---

## 5. Typography

Typography should follow the visual identity of the existing website.

Analyze the screenshots to identify:

- Heading font
- Body font
- Font weights
- Heading hierarchy
- Text sizes
- Line heights
- Letter spacing

Maintain a clear distinction between headings, body text, labels and supporting information.

Typography should feel elegant, readable and approachable.

Avoid introducing unnecessary font families.

---

## 6. Layout & Spacing

The interface should maintain the spacious and welcoming character of the hotel's website.

Guidelines:

- Use consistent spacing throughout the application.
- Maintain clear visual hierarchy.
- Avoid unnecessarily dense layouts.
- Use whitespace to separate content and improve readability.
- Keep alignment consistent across pages.
- Use a coherent grid system.
- Avoid excessive use of borders and shadows.

The layout should prioritize usability without losing the hotel's visual identity.

---

## 7. UI Components

All reusable components must follow a consistent visual language.

### Buttons
- Follow the existing brand colors.
- Use consistent sizing and spacing.
- Provide clear hover, focus, active and disabled states.
- Make primary actions visually distinguishable.

### Cards
- Use consistent padding and spacing.
- Follow the visual treatment of the existing website.
- Avoid excessive shadows and decorative elements.

### Forms & Inputs
- Maintain a clean and intuitive appearance.
- Use consistent input heights and border treatments.
- Make labels and validation messages easy to understand.
- Provide clear focus and error states.

### Navigation
- Maintain clear information hierarchy.
- Use consistent typography and spacing.
- Make navigation intuitive and predictable.

### Tables & Data Displays
- Prioritize readability.
- Use consistent alignment and spacing.
- Keep the design visually calm and uncluttered.
- Use subtle visual distinctions between rows and sections.

---

## 8. Images & Visual Assets

Use the provided screenshots and existing brand assets as references.

Guidelines:

- Maintain the hotel's established photographic style.
- Prefer authentic hospitality imagery over generic stock photography.
- Avoid unnecessary decorative illustrations.
- Use images intentionally and consistently.
- Respect the existing logo and brand assets.

Do not create a new logo or alter existing brand assets.

---

## 9. Interaction & User Experience

The interface should be intuitive and easy to navigate.

Prioritize:

- Clear calls to action
- Predictable interactions
- Immediate visual feedback
- Accessible contrast
- Consistent interaction patterns
- Clear loading, success and error states

Visual design must support the functionality of the system rather than compete with it.

---

## 10. Responsive Design

The interface must work across desktop, tablet and mobile.

Guidelines:

- Preserve the visual identity across screen sizes.
- Maintain readable typography.
- Adapt navigation and layouts to smaller screens.
- Avoid horizontal overflow.
- Keep important actions accessible.
- Ensure forms and interactive elements remain easy to use.

---

## 11. Design Consistency & Implementation Rules

These rules apply to all frontend development.

1. Always consult this style guide before implementing new UI.
2. Always inspect relevant screenshots before creating new components.
3. Reuse existing components and design tokens whenever possible.
4. Do not introduce new colors, fonts or visual patterns without justification.
5. Do not redesign the hotel's brand identity.
6. Do not sacrifice usability for visual similarity.
7. Keep the implementation consistent across all pages.
8. Prefer reusable components over one-off styling solutions.
9. Keep styling separate from business logic.
10. Do not modify backend functionality or existing business logic when making visual changes.

### Priority order

When making frontend design decisions, follow this priority:

1. Functional requirements and existing system specifications.
2. Hotel Kong Arthur's visual identity.
3. Existing screenshot references.
4. Consistency with the established design system.
5. General frontend design conventions.

---

## 12. Final Design Objective

The finished application should look and feel like it belongs to Hotel Kong Arthur.

A visitor should recognize the hotel's visual identity without necessarily seeing the original website.

The result should combine the warmth, personality and understated elegance of a Copenhagen boutique hotel with the clarity and usability of a modern digital platform.

**The goal is not to build a generic hotel application. The goal is to build a digital product that feels authentically like Hotel Kong Arthur.**