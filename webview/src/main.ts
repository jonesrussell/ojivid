import './style.css'

interface AppState {
  count: number
}

const state: AppState = {
  count: 0
}

function updateUI() {
  const app = document.querySelector<HTMLDivElement>('#app')!
  app.innerHTML = `
    <div class="app">
      <h1>Ojivid</h1>
      <div class="card">
        <button id="counter">count is ${state.count}</button>
        <p>
          Edit <code>src/main.ts</code> and save to test HMR
        </p>
      </div>
    </div>
  `

  // Add event listener to the button
  const button = document.querySelector<HTMLButtonElement>('#counter')!
  button.addEventListener('click', () => {
    state.count++
    updateUI()
  })
}

// Initial render
updateUI() 