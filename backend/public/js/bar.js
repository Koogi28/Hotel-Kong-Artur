// Barens side (T043, US3). Kun fetch mod /api/bar/* via api.js.
// Ingen beregning i browseren (FR-029): totaler, omsætning og procenter kommer fra API'et, og
// efter et salg hentes tallene igen i stedet for at blive lagt sammen her.

const CATEGORY_LABELS = { Coffee: 'Kaffe', Cocktail: 'Cocktails' }; // kun visning

const form = document.getElementById('sale-form');
const groups = document.getElementById('drink-groups');
const quantityInput = document.getElementById('quantity');
const selected = document.getElementById('selected');
const registerButton = document.getElementById('register');
const message = document.getElementById('message');
const byId = (id) => document.getElementById(id);

let drinks = [];
let selectedDrink = null;

// ---------- Menu ----------

async function loadMenu() {
  try {
    drinks = await apiGet('/bar/drinks');
    renderMenu();
  } catch (error) {
    groups.innerHTML = '';
    showAlert(message, 'error', `Menuen kunne ikke hentes: ${error.message}`);
  }
}

// Kaffe først (mest solgt i antal), derefter cocktails. Rækkefølgen inden for en gruppe er API'ets.
function renderMenu() {
  groups.innerHTML = ['Coffee', 'Cocktail'].map((category) => {
    const items = drinks.filter((drink) => drink.category === category);
    return `<fieldset class="drink-group">
      <legend>${CATEGORY_LABELS[category]}</legend>
      <div class="drink-grid">
        ${items.map((drink) => `<button class="button button--secondary drink-button" type="button"
            data-id="${drink.id}" aria-pressed="false">
            <span>${escapeHtml(drink.name)}</span>
            <span class="drink-button__price">${formatDkk(drink.price)}</span>
          </button>`).join('')}
      </div>
    </fieldset>`;
  }).join('');
}

function selectDrink(drink) {
  selectedDrink = drink;
  groups.querySelectorAll('.drink-button').forEach((button) => {
    button.setAttribute('aria-pressed', String(Number(button.dataset.id) === (drink && drink.id)));
  });
  selected.textContent = drink ? `${drink.name} (${formatDkk(drink.price)} pr. stk.)` : 'Ingen valgt';
}

groups.addEventListener('click', (event) => {
  const button = event.target.closest('.drink-button');
  if (!button) return;
  selectDrink(drinks.find((drink) => drink.id === Number(button.dataset.id)));
  clearAlert(message);
});

// ---------- Registrér salg (FR-022) ----------

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  clearFieldErrors(form);
  clearAlert(message);

  const raw = quantityInput.value.trim();
  const body = {
    drink_id: selectedDrink ? selectedDrink.id : null,
    quantity: raw === '' ? null : Number(raw), // API'et validerer 1–1000 (FR-022)
  };

  registerButton.disabled = true;
  try {
    const sale = await apiSend('POST', '/bar/sales', body);
    const time = sale.sold_at.slice(11, 16); // 'YYYY-MM-DD HH:MM:SS' fra API'et, dansk tid
    showAlert(message, 'success', `${sale.quantity} × ${selectedDrink.name} registreret kl. ${time}.`);
    quantityInput.value = '1';
    selectDrink(null);
    await loadKpis(); // Tallene hentes igen fra API'et
  } catch (error) {
    if (error.status === 400 && error.fields.includes('drink_id')) {
      showAlert(message, 'error', 'Vælg en drikkevare fra menuen.');
    }
    if (error.status === 400 && error.fields.includes('quantity')) {
      markFieldErrors(form, ['quantity'], 'Antal skal være et helt tal fra 1 til 1000');
      if (!error.fields.includes('drink_id')) {
        showAlert(message, 'error', 'Salget er ikke registreret. Ret antallet.');
      }
      quantityInput.focus();
    } else if (error.status !== 400) {
      showAlert(message, 'error', error.message);
    }
  } finally {
    registerButton.disabled = false;
  }
});

// ---------- Nøgletal (FR-024–FR-026) ----------

function renderTotal(total) {
  byId('total-units').textContent = formatNumber(total.units_sold);
  byId('total-revenue').textContent = formatDkk(total.revenue);
}

function renderSplit(rows) {
  [['Coffee', 'coffee'], ['Cocktail', 'cocktail']].forEach(([category, id]) => {
    const row = rows.find((r) => r.category === category);
    byId(`split-${id}`).textContent = row ? formatPercent(row.percent) : '–';
    byId(`split-${id}-label`).textContent = row
      ? `${CATEGORY_LABELS[category]} · ${formatDkk(row.revenue)} af omsætningen`
      : CATEGORY_LABELS[category];
  });
}

function renderDrinks(rows) {
  byId('drink-rows').innerHTML = rows.map((row) => `<tr>
      <td>${escapeHtml(row.name)}</td>
      <td>${escapeHtml(CATEGORY_LABELS[row.category] || row.category)}</td>
      <td class="num">${formatDkk(row.price)}</td>
      <td class="num">${formatNumber(row.units_sold)}</td>
      <td class="num">${formatDkk(row.revenue)}</td>
    </tr>`).join('');
}

async function loadKpis() {
  const sections = [
    ['/bar/kpi/total', renderTotal],
    ['/bar/kpi/category-split', renderSplit],
    ['/bar/kpi/revenue-by-drink', renderDrinks],
  ];
  const results = await Promise.allSettled(sections.map(([path]) => apiGet(path)));
  const failed = [];
  results.forEach((result, index) => {
    if (result.status === 'fulfilled') sections[index][1](result.value);
    else failed.push(result.reason.message);
  });
  const time = new Date().toLocaleTimeString('da-DK', { timeZone: 'Europe/Copenhagen' });
  byId('updated').textContent = `Opdateret kl. ${time}`;
  if (failed.length) {
    showAlert(message, 'error', `Nogle tal kunne ikke hentes: ${[...new Set(failed)].join(' ')}`);
  }
}

loadMenu();
loadKpis();
