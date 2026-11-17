import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { PasswordInput } from "@/components/password-input";

describe("PasswordInput", () => {
  it.each([
    ["password", "current-password", "password"],
    ["password", "new-password", "password"],
    ["confirmPassword", "new-password", "password confirmation"],
  ] as const)("starts hidden and offers an accessible reveal control (%s, %s)", (id, autoComplete, label) => {
    const html = renderToStaticMarkup(
      <PasswordInput id={id} name={id} label={label} autoComplete={autoComplete} minLength={8} maxLength={72} />,
    );
    expect(html).toContain('type="password"');
    expect(html).toContain(`id="${id}"`);
    expect(html).toContain(`autocomplete="${autoComplete}"`);
    expect(html).toContain('type="button"');
    expect(html).toContain(`aria-label="Show ${label}"`);
    expect(html).toContain(`aria-controls="${id}"`);
    expect(html).toContain('aria-pressed="false"');
    expect(html).toContain(">Show</button>");
    expect(html).toContain('required=""');
  });

  it("does not expose or retain the user's password in the toggle component", () => {
    const html = renderToStaticMarkup(
      <PasswordInput id="secret" name="password" label="password" autoComplete="new-password" />,
    );
    expect(html).not.toContain('value="');
    expect(html).toContain('autocomplete="new-password"');
  });
});
