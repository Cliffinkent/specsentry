"use client";

import { FormEvent, useState } from "react";
import type { DemoMode } from "@/lib/schemas";

type Stage = "product" | "basket" | "delivery" | "dependency" | "review" | "payment";

const product = {
  name: "Alpine Trail Backpack",
  price: 80,
  colour: "Forest green",
};

const deliveryCharge = 4.95;

function money(value: number) {
  return new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" }).format(value);
}

function Progress({ stage }: { stage: Stage }) {
  const labels: Array<[Stage, string]> = [
    ["basket", "Basket"],
    ["delivery", "Delivery"],
    ["review", "Review"],
    ["payment", "Payment"],
  ];
  const stageIndex = labels.findIndex(([value]) => value === stage);

  return (
    <ol aria-label="Checkout progress" className="grid grid-cols-4 border-y border-[#d8d2c3] text-xs font-bold uppercase tracking-[0.14em]">
      {labels.map(([value, label], index) => (
        <li key={value} aria-current={value === stage ? "step" : undefined} className={`px-3 py-4 ${index <= stageIndex ? "bg-[#1d4f47] text-white" : "text-[#687169]"}`}>
          {index + 1}. {label}
        </li>
      ))}
    </ol>
  );
}

export function ShopJourney({ mode }: { mode: DemoMode }) {
  const [stage, setStage] = useState<Stage>("product");
  const [validationError, setValidationError] = useState<string | null>(null);
  const [missingDeliveryDetails, setMissingDeliveryDetails] = useState(false);

  function submitDelivery(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const requiredFields: Array<[string, string]> = [
      ["name", "Enter your full name."],
      ["email", "Enter your email address."],
      ["address", "Enter address line 1."],
      ["city", "Enter your town or city."],
      ["postcode", "Enter your postcode."],
    ];
    const missing = requiredFields.filter(([name]) => !String(form.get(name) || "").trim());
    if (missing.length > 0 && mode !== "validation-missing") {
      setValidationError(missing[0][1]);
      return;
    }
    setValidationError(null);
    setMissingDeliveryDetails(missing.length > 0);
    setStage("review");
  }

  return (
    <main className="min-h-screen bg-[#f6f2e8] text-[#17211b]">
      <header className="border-b border-[#d8d2c3] bg-[#fffdf8]">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div>
            <p className="text-2xl font-black tracking-[-0.04em]">SENTRY / SHOP</p>
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#536158]">Field gear for ordinary escapes</p>
          </div>
          <span data-testid="fixture-mode" className="rounded-full border border-[#17211b] px-3 py-1 text-xs font-bold uppercase tracking-wider">{mode} build</span>
        </div>
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8">
        {stage !== "product" && <Progress stage={stage === "dependency" ? "delivery" : stage} />}

        {stage === "product" && (
          <section aria-labelledby="product-title" className="grid gap-10 py-8 md:grid-cols-2">
            <div className="flex min-h-[480px] items-end bg-[#dce6d0] p-8" aria-label="Forest green Alpine Trail Backpack product image">
              <div className="w-full rounded-[3rem_3rem_1rem_1rem] border-[14px] border-[#214b3f] bg-[#386b5c] p-10 shadow-[inset_0_0_0_2px_#9fc1a0]">
                <div className="mx-auto h-28 w-40 rounded-xl border-4 border-[#183a31] bg-[#315e51]" />
                <p className="mt-16 text-center text-xs font-black uppercase tracking-[0.28em] text-[#f3f0e8]">Sentry Supply Co.</p>
              </div>
            </div>
            <div className="flex flex-col justify-center">
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5d52]">Daypack / 28L</p>
              <h1 id="product-title" className="mt-3 text-5xl font-black tracking-[-0.05em]">{product.name}</h1>
              <p className="mt-4 text-3xl font-bold">{money(product.price)}</p>
              <p className="mt-6 max-w-xl text-base leading-7 text-[#5a655e]">Weather-resistant canvas, padded laptop sleeve and enough room for the long way home. Colour: {product.colour}.</p>
              <button type="button" onClick={() => setStage("basket")} className="mt-10 w-full bg-[#17211b] px-5 py-4 text-left font-black uppercase tracking-[0.12em] text-white hover:bg-[#1d5d52]">Add to basket <span className="float-right">+</span></button>
            </div>
          </section>
        )}

        {stage === "basket" && (
          <section aria-labelledby="basket-title" className="mx-auto max-w-3xl py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5d52]">1 item reserved</p>
            <h1 id="basket-title" className="mt-3 text-5xl font-black tracking-[-0.05em]">Your basket</h1>
            <div className="mt-8 border-y border-[#d8d2c3] py-6">
              <div className="flex items-start justify-between gap-6">
                <div><h2 className="text-xl font-bold">{product.name}</h2><p className="mt-1 text-sm text-[#5a655e]">{product.colour} · Quantity 1</p></div>
                <p className="font-bold">{money(product.price)}</p>
              </div>
              <div className="mt-8 flex justify-between border-t border-[#d8d2c3] pt-5 text-lg"><span>Basket subtotal</span><strong>{money(product.price)}</strong></div>
            </div>
            <button type="button" onClick={() => setStage(mode === "dependency-unavailable" ? "dependency" : "delivery")} className="mt-8 w-full bg-[#17211b] px-5 py-4 font-black uppercase tracking-[0.12em] text-white">Continue as guest</button>
          </section>
        )}

        {stage === "dependency" && (
          <section aria-labelledby="dependency-title" className="mx-auto max-w-3xl py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a34c23]">Defined test prerequisite</p>
            <h1 id="dependency-title" className="mt-3 text-5xl font-black tracking-[-0.05em]">Delivery quote sandbox unavailable</h1>
            <div data-testid="dependency-blocker" className="mt-8 border-l-4 border-[#a34c23] bg-[#fff2ec] p-6">
              <p className="font-bold">The deliberately unavailable fixture dependency could not provide a delivery quote.</p>
              <p className="mt-3 text-sm leading-6 text-[#5a655e]">Guest delivery cannot be evaluated until this defined prerequisite is restored. No product defect is asserted by this fixture state.</p>
            </div>
          </section>
        )}

        {stage === "delivery" && (
          <section aria-labelledby="delivery-title" className="mx-auto max-w-3xl py-12">
            <h1 id="delivery-title" className="text-5xl font-black tracking-[-0.05em]">Delivery details</h1>
            <p className="mt-4 text-[#5a655e]">Use deterministic demo details. No account or payment is created.</p>
            <form onSubmit={submitDelivery} className="mt-8 grid gap-5 sm:grid-cols-2">
              <label className="grid gap-2 text-sm font-bold">Full name<input aria-required="true" name="name" autoComplete="off" className="border border-[#948f84] bg-white px-4 py-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-bold">Email address<input aria-required="true" name="email" type="email" autoComplete="off" className="border border-[#948f84] bg-white px-4 py-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-bold sm:col-span-2">Address line 1<input aria-required="true" name="address" autoComplete="off" className="border border-[#948f84] bg-white px-4 py-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-bold">Town or city<input aria-required="true" name="city" autoComplete="off" className="border border-[#948f84] bg-white px-4 py-3 font-normal" /></label>
              <label className="grid gap-2 text-sm font-bold">Postcode<input aria-required="true" name="postcode" autoComplete="off" className="border border-[#948f84] bg-white px-4 py-3 font-normal" /></label>
              {validationError && <p role="alert" data-testid="delivery-validation" className="border-l-4 border-[#a34c23] bg-[#fff2ec] p-4 text-sm font-bold sm:col-span-2">{validationError}</p>}
              <button type="submit" className="mt-4 bg-[#17211b] px-5 py-4 font-black uppercase tracking-[0.12em] text-white sm:col-span-2">Review order</button>
            </form>
          </section>
        )}

        {stage === "review" && (
          <section aria-labelledby="review-title" className="mx-auto max-w-3xl py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#1d5d52]">Check before continuing</p>
            <h1 id="review-title" className="mt-3 text-5xl font-black tracking-[-0.05em]">Order review</h1>
            <div className="mt-8 border border-[#d8d2c3] bg-[#fffdf8] p-6 shadow-[6px_6px_0_#17211b]">
              {mode === "basket-lost" ? (
                <div data-testid="review-empty-basket" className="border-l-4 border-[#a34c23] bg-[#fff2ec] p-5">
                  <strong>Your basket is empty</strong>
                  <p className="mt-2 text-sm text-[#6b5f54]">The selected product is no longer present in this order summary.</p>
                </div>
              ) : (
                <>
                  <div className="flex justify-between border-b border-[#d8d2c3] pb-5"><span>{product.name}</span><strong>{money(product.price)}</strong></div>
                  <div data-testid="review-subtotal" className="flex justify-between pt-5"><span>Basket subtotal</span><strong>{money(product.price)}</strong></div>
                  {mode !== "defective" && (
                    <>
                      <div data-testid="review-delivery" className="mt-4 flex justify-between"><span>Delivery charge</span><strong>{money(deliveryCharge)}</strong></div>
                      <div data-testid="review-total" className="mt-5 flex justify-between border-t-2 border-[#17211b] pt-5 text-xl"><span>Final total</span><strong>{money(product.price + deliveryCharge)}</strong></div>
                    </>
                  )}
                  {mode === "defective" && <p data-testid="review-missing-costs" className="mt-5 border-t border-[#d8d2c3] pt-5 text-sm text-[#6b5f54]">Additional costs are shown on the next step.</p>}
                </>
              )}
            </div>
            {mode === "validation-missing" && missingDeliveryDetails && (
              <p role="alert" data-testid="missing-validation-warning" className="mt-6 border-l-4 border-[#a34c23] bg-[#fff2ec] p-4 font-bold">Delivery details were accepted while required fields were empty.</p>
            )}
            <button type="button" onClick={() => setStage("payment")} className="mt-8 w-full bg-[#17211b] px-5 py-4 font-black uppercase tracking-[0.12em] text-white">Continue towards payment</button>
          </section>
        )}

        {stage === "payment" && (
          <section aria-labelledby="payment-title" className="mx-auto max-w-3xl py-12">
            <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#a34c23]">Demo boundary</p>
            <h1 id="payment-title" className="mt-3 text-5xl font-black tracking-[-0.05em]">Payment is disabled</h1>
            <p className="mt-5 text-lg text-[#5a655e]">The fixture never asks for or submits payment details.</p>
            <dl className="mt-8 border-y border-[#d8d2c3] py-5">
              <div className="flex justify-between"><dt>Delivery charge</dt><dd className="font-bold">{money(deliveryCharge)}</dd></div>
              <div className="mt-4 flex justify-between text-xl"><dt>Final total</dt><dd className="font-black">{money(product.price + deliveryCharge)}</dd></div>
            </dl>
          </section>
        )}
      </div>
    </main>
  );
}
