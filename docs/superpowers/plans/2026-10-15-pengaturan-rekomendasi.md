# Pengaturan Rekomendasi Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Admin dapat mengatur parameter aturan rekomendasi stok (terutama sinyal retur/BS) dari halaman `/dashboard/pengaturan`, berlaku di mode simulasi (localStorage) dan mode api (file JSON di backend).

**Architecture:** Backend Go menambah field `Params`, paket `internal/settings` (store file JSON + mutex) dan `GET/PUT /api/v1/forecast/settings`. Frontend memparametrisasi `computeRecommendations`, menambah hook `useRecommendationParams` (TanStack Query di mode api, `useSyncExternalStore` + localStorage di mode simulasi), dan halaman form RHF + zod.

**Tech Stack:** Go 1.2x stdlib (`net/http`, `encoding/json`), Next.js 16, MUI 9, react-hook-form 7, zod 4, TanStack Query 5.

**Spec:** `docs/superpowers/specs/2026-10-15-pengaturan-rekomendasi-design.md`

## Global Constraints

- Default params HARUS menghasilkan rekomendasi identik dengan perilaku sebelum perubahan (FE & BE).
- Aturan FE (`forecast-utils.ts`) dan BE (`recommend.go`) harus identik untuk params yang sama.
- Database klien tetap read-only; pengaturan disimpan di file terpisah (`AI_FORECAST_SETTINGS`, default `settings.json`, di-.gitignore).
- UI berbahasa Indonesia; penanda sumber data ("simulasi" / "data asli · baseline") tetap ada.
- FE: yarn saja; import absolut `src/...`; `import type`; route via `paths`; form pakai `Field.*`; tidak ada test runner → gate = `yarn lint`, `yarn tsc:check`, `yarn build`.
- Ikon hanya dari registry offline (`src/components/iconify/icon-sets.ts`): pakai `carbon:settings-adjust`, `solar:restart-bold`.
- Repo FE punya perubahan user yang belum di-commit (`nav-dashboard.tsx`, `forecast-kpi-grid.tsx`, `dashboard-view.tsx`) — JANGAN di-stage/commit; selalu `git add` path spesifik.

## Review Focus

1. File `settings.json` rusak / berisi nilai di luar rentang → server tetap jalan dengan default (log peringatan), tidak crash. (Task 2 tes `TestOpenCorruptFile`, `TestOpenInvalidParams`.)
2. PUT dengan `return_streak > return_window` atau `min_observations > window` → 422 dengan error per field, file tidak berubah. (Task 3 tes `TestSettingsValidation`.)
3. Pengurangan persen pada dasar kecil (mis. base 2 × 10% = 0.2) → tetap minimal 1 pcs. (Task 1 tes `TestReturnCutPercentMinimumOne`.)
4. localStorage diblokir / berisi JSON rusak → mode simulasi memakai default, simpan tetap berlaku selama sesi (fallback memori). (Task 6 cek manual langkah 6.)
5. Respons 422 dari backend → pesan muncul di field form yang tepat, bukan hanya toast umum. (Task 7 cek manual.)

---

## Bagian A — Backend (`/Users/user/Documents/Claude/Projects/ai-forecast/ai-forecast-be`)

> **STATUS (2026-10-15): DITUNDA.** Atas permintaan user, Task 1–3 belum dikerjakan — hanya
> dicatat. Frontend (Bagian B) sudah dibuat dan siap memakai endpoint ini. Sampai backend
> selesai, mode `api` memakai `DefaultParams` server dan halaman Pengaturan menampilkan
> pemberitahuan "backend belum mendukung". Saat mengerjakan backend, ikuti Task 1–3 apa adanya;
> kontraknya sudah dipakai FE di `src/lib/api/forecast.ts` (`forecastSettingsSchema`, `toRawParams`).
>
> **REVISI (b):** sebelum mengerjakan Task 1–3, terapkan "Revisi 2026-10-15 (b)" di spec — field
> `return_signal_enabled`, `stockout_enabled`, `stockout_streak`, `stockout_bonus_unit`, rentang baru
> `stockout_bonus`, dan pembulatan persen ke atas (`max(1, ceil(base*rasio - 1e-9))`). Kode Go di Task 1
> di bawah masih versi awal; acuan akhirnya `adjustAmount`/`stockoutStreakOk` di
> `src/sections/forecast/forecast-utils.ts`. Tambahkan tes: habis 3 kunjungan +2% (kirim 10 → 11,
> kirim 50 → 51), +7% dari 100 → 107 (bukan 108), sinyal dimatikan → tanpa penyesuaian.

### Task 1: Params baru + aturan retur yang bisa diatur

**Files:**
- Modify: `internal/forecast/model.go` (struct `Params`, `DefaultParams`, tambah `Validate`)
- Modify: `internal/forecast/recommend.go` (observasi, sinyal habis/retur)
- Test: `internal/forecast/forecast_test.go`

**Interfaces:**
- Produces: `forecast.Params{Window, MinObservations, ReturnThreshold, ReturnWindow, ReturnStreak, ReturnCutUnit, ReturnCut, StockoutBonus, MaxStepRatio, MinStep}` (json snake_case), `func (p Params) Validate() map[string][]string` (nil bila valid), `forecast.DefaultParams`.

- [ ] **Step 1: Tulis tes yang gagal** — tambahkan di akhir `internal/forecast/forecast_test.go`:

```go
// spikeData: kiriman 10 tiap minggu, BS hanya di kunjungan terakhir (9).
// Observasi andal: 4 (bs 0,0,0,9) → median terjual 10; rasio retur 3 obs
// terakhir = 9/30 = 30%.
func spikeData() *Dataset {
	dates := []string{"2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"}
	var kiriman []Row
	for _, tgl := range dates {
		kiriman = append(kiriman, row(tgl, "1001", "a", map[string]int{"ncp": 10}))
	}
	bs := []Row{row("2026-09-29", "1001", "a", map[string]int{"ncp": 9})}
	return NewDataset(testProducts(), nil, kiriman, bs, nil)
}

func recommendOne(t *testing.T, d *Dataset, p Params) Recommendation {
	t.Helper()
	recs := d.Recommend(d.Cells, "2026-09-30", p)
	if len(recs) != 1 || recs[0].Recommended == nil {
		t.Fatalf("ingin 1 rekomendasi aktif, dapat %+v", recs)
	}
	return recs[0]
}

func TestReturnStreakDefaultMatchesOldRule(t *testing.T) {
	r := recommendOne(t, spikeData(), DefaultParams)
	if *r.Recommended != 9 || !contains(r.Signals, "retur-tinggi") {
		t.Fatalf("default: 10 − 1 = 9 dengan retur-tinggi, dapat %+v", r)
	}
}

func TestReturnStreakRequiresConsecutiveVisits(t *testing.T) {
	p := DefaultParams
	p.ReturnStreak = 2
	r := recommendOne(t, spikeData(), p)
	// Hanya kunjungan terakhir yang > 15% → tidak diturunkan.
	if *r.Recommended != 10 || contains(r.Signals, "retur-tinggi") {
		t.Fatalf("streak 2 tidak terpenuhi, ingin 10 tanpa sinyal, dapat %+v", r)
	}
}

func TestReturnWindowChangesRate(t *testing.T) {
	p := DefaultParams
	p.ReturnWindow = 4
	p.ReturnThreshold = 0.25
	r := recommendOne(t, spikeData(), p)
	// 4 obs: 9/40 = 22.5% ≤ 25% → tidak diturunkan.
	if *r.Recommended != 10 || contains(r.Signals, "retur-tinggi") {
		t.Fatalf("window 4: rasio 22.5%% di bawah ambang, dapat %+v", r)
	}
}

func TestReturnCutPcs(t *testing.T) {
	p := DefaultParams
	p.ReturnCut = 2
	r := recommendOne(t, spikeData(), p)
	if *r.Recommended != 8 {
		t.Fatalf("10 − 2 = 8, dapat %+v", r)
	}
}

func TestReturnCutPercent(t *testing.T) {
	p := DefaultParams
	p.ReturnCutUnit = "persen"
	p.ReturnCut = 0.2
	r := recommendOne(t, spikeData(), p)
	// round(10 × 20%) = 2 → 8.
	if *r.Recommended != 8 {
		t.Fatalf("10 − 20%% = 8, dapat %+v", r)
	}
}

func TestReturnCutPercentMinimumOne(t *testing.T) {
	p := DefaultParams
	p.ReturnCutUnit = "persen"
	p.ReturnCut = 0.01
	r := recommendOne(t, spikeData(), p)
	// round(10 × 1%) = 0 → minimal 1 pcs.
	if *r.Recommended != 9 {
		t.Fatalf("pengurangan persen minimal 1 pcs, dapat %+v", r)
	}
}

func TestStockoutBonus(t *testing.T) {
	dates := []string{"2026-09-01", "2026-09-08", "2026-09-15", "2026-09-22", "2026-09-29"}
	var kiriman []Row
	for _, tgl := range dates {
		kiriman = append(kiriman, row(tgl, "1001", "a", map[string]int{"ncp": 4}))
	}
	d := NewDataset(testProducts(), nil, kiriman, nil, nil)

	for bonus, want := range map[int]int{0: 4, 1: 5, 2: 6} {
		p := DefaultParams
		p.StockoutBonus = bonus
		r := recommendOne(t, d, p)
		if *r.Recommended != want || !contains(r.Signals, "habis") {
			t.Fatalf("bonus %d: ingin %d + sinyal habis, dapat %+v", bonus, want, r)
		}
	}
}

func TestParamsValidate(t *testing.T) {
	if errs := DefaultParams.Validate(); errs != nil {
		t.Fatalf("DefaultParams harus valid: %v", errs)
	}
	bad := DefaultParams
	bad.ReturnThreshold = 0
	bad.ReturnStreak = 4
	bad.ReturnWindow = 3
	bad.MinObservations = 5
	bad.ReturnCutUnit = "kg"
	errs := bad.Validate()
	for _, field := range []string{"return_threshold", "return_streak", "min_observations", "return_cut_unit"} {
		if len(errs[field]) == 0 {
			t.Fatalf("field %s harus error: %v", field, errs)
		}
	}
	pcs := DefaultParams
	pcs.ReturnCut = 1.5
	if len(pcs.Validate()["return_cut"]) == 0 {
		t.Fatal("pengurangan pcs harus bilangan bulat")
	}
}
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `cd /Users/user/Documents/Claude/Projects/ai-forecast/ai-forecast-be && go test ./internal/forecast/`
Expected: FAIL kompilasi — `p.ReturnStreak undefined`, `DefaultParams.Validate undefined`.

- [ ] **Step 3: Implementasi `model.go`** — ganti blok `Params`/`DefaultParams` dengan:

```go
// Params adalah parameter aturan baseline. Nilainya CONTOH — dipilih ulang
// lewat backtest, bukan ditebak. Dapat diubah admin lewat
// PUT /api/v1/forecast/settings; rentang valid ada di Validate.
type Params struct {
	Window          int     `json:"window"`
	MinObservations int     `json:"min_observations"`
	ReturnThreshold float64 `json:"return_threshold"`
	// ReturnWindow: jumlah observasi andal terakhir untuk rasio retur.
	ReturnWindow int `json:"return_window"`
	// ReturnStreak: kunjungan terakhir beruntun yang masing-masing harus di
	// atas ambang (≤ 1 = cukup rasio agregat).
	ReturnStreak int `json:"return_streak"`
	// ReturnCutUnit "pcs" → ReturnCut pcs; "persen" → ReturnCut × dasar
	// (dibulatkan, minimal 1 pcs).
	ReturnCutUnit string  `json:"return_cut_unit"`
	ReturnCut     float64 `json:"return_cut"`
	// StockoutBonus: tambahan pcs saat sinyal habis.
	StockoutBonus int     `json:"stockout_bonus"`
	MaxStepRatio  float64 `json:"max_step_ratio"`
	MinStep       int     `json:"min_step"`
}

// DefaultParams sama dengan DEFAULT_REC_PARAMS di frontend.
var DefaultParams = Params{
	Window:          4,
	MinObservations: 3,
	ReturnThreshold: 0.15,
	ReturnWindow:    3,
	ReturnStreak:    1,
	ReturnCutUnit:   "pcs",
	ReturnCut:       1,
	StockoutBonus:   1,
	MaxStepRatio:    0.3,
	MinStep:         2,
}

// Validate mengembalikan error per field (kunci JSON) atau nil bila valid.
// Rentang sama dengan recParamsFormSchema di frontend.
func (p Params) Validate() map[string][]string {
	errs := map[string][]string{}
	add := func(field, msg string) { errs[field] = append(errs[field], msg) }
	intRange := func(field string, v, lo, hi int) {
		if v < lo || v > hi {
			add(field, fmt.Sprintf("Harus antara %d dan %d.", lo, hi))
		}
	}
	floatRange := func(field string, v, lo, hi float64) {
		if math.IsNaN(v) || v < lo || v > hi {
			add(field, fmt.Sprintf("Harus antara %g dan %g.", lo, hi))
		}
	}

	intRange("window", p.Window, 1, 12)
	intRange("min_observations", p.MinObservations, 1, 12)
	if p.MinObservations > p.Window {
		add("min_observations", "Tidak boleh melebihi jumlah kunjungan dasar.")
	}
	floatRange("return_threshold", p.ReturnThreshold, 0.01, 1)
	intRange("return_window", p.ReturnWindow, 1, 8)
	intRange("return_streak", p.ReturnStreak, 1, 8)
	if p.ReturnStreak > p.ReturnWindow {
		add("return_streak", "Tidak boleh melebihi jumlah kunjungan untuk rasio retur.")
	}
	switch p.ReturnCutUnit {
	case "pcs":
		floatRange("return_cut", p.ReturnCut, 1, 50)
		if p.ReturnCut != math.Trunc(p.ReturnCut) {
			add("return_cut", "Harus bilangan bulat.")
		}
	case "persen":
		floatRange("return_cut", p.ReturnCut, 0.01, 0.9)
	default:
		add("return_cut_unit", "Harus pcs atau persen.")
	}
	intRange("stockout_bonus", p.StockoutBonus, 0, 20)
	floatRange("max_step_ratio", p.MaxStepRatio, 0.05, 1)
	intRange("min_step", p.MinStep, 0, 50)

	if len(errs) == 0 {
		return nil
	}
	return errs
}
```

Tambahkan `"fmt"` dan `"math"` ke import `model.go` bila belum ada.

- [ ] **Step 4: Implementasi `recommend.go`**

4a. Ganti closure `observations` (sekitar baris 56–66) dengan:

```go
	reliable := func(pc []Cell) []Cell {
		var obs []Cell
		for _, c := range pc {
			if c.Reliable && c.EstSold != nil {
				obs = append(obs, c)
			}
		}
		return obs
	}
	observations := func(pc []Cell) []Cell { return lastN(reliable(pc), p.Window) }
```

4b. Ganti blok `obs := observations(pc)` … `returnRate = &rr }` di dalam loop dengan:

```go
		allObs := reliable(pc)
		obs := lastN(allObs, p.Window)
		retObs := lastN(allObs, p.ReturnWindow)
		obsBasis, obsBS := 0, 0
		for _, c := range retObs {
			obsBasis += *c.PrevKirim
			obsBS += c.BS
		}
		var returnRate *float64
		if obsBasis > 0 {
			rr := float64(obsBS) / float64(obsBasis)
			returnRate = &rr
		}
```

4c. Ganti blok sinyal habis/retur:

```go
		adjustment := 0
		if n := len(obs); n >= 2 && obs[n-1].BS == 0 && obs[n-1].Stock == 0 && obs[n-2].BS == 0 && obs[n-2].Stock == 0 {
			adjustment += p.StockoutBonus
			signals = append(signals, "habis")
		}
		if returnRate != nil && *returnRate > p.ReturnThreshold && returnStreakOK(retObs, p) {
			adjustment -= returnCut(base, p)
			signals = append(signals, "retur-tinggi")
		}
```

4d. Tambahkan helper di bawah `roundHalfUp`:

```go
// lastN mengambil n elemen terakhir (seluruhnya bila lebih pendek).
func lastN(cells []Cell, n int) []Cell {
	if len(cells) > n {
		return cells[len(cells)-n:]
	}
	return cells
}

// returnStreakOK: ReturnStreak observasi terakhir masing-masing punya rasio
// BS/kiriman sebelumnya di atas ambang. Streak ≤ 1 = cukup rasio agregat.
func returnStreakOK(retObs []Cell, p Params) bool {
	if p.ReturnStreak <= 1 {
		return true
	}
	if len(retObs) < p.ReturnStreak {
		return false
	}
	for _, c := range retObs[len(retObs)-p.ReturnStreak:] {
		if float64(c.BS)/float64(*c.PrevKirim) <= p.ReturnThreshold {
			return false
		}
	}
	return true
}

// returnCut: besar pengurangan saat retur tinggi.
func returnCut(base float64, p Params) int {
	if p.ReturnCutUnit == "persen" {
		return max(1, roundHalfUp(base*p.ReturnCut))
	}
	return int(p.ReturnCut)
}
```

- [ ] **Step 5: Jalankan semua tes forecast**

Run: `go test ./internal/forecast/`
Expected: PASS (termasuk `TestRecommendationSignals` dan `TestReturnSignalLowersRecommendation` lama — bukti default tidak berubah).

- [ ] **Step 6: Commit (repo BE)**

```bash
git add internal/forecast/model.go internal/forecast/recommend.go internal/forecast/forecast_test.go
git commit -m "feat(forecast): parameter sinyal retur & habis bisa diatur"
```

---

### Task 2: Paket `internal/settings` (store file JSON)

**Files:**
- Create: `internal/settings/store.go`
- Test: `internal/settings/store_test.go`

**Interfaces:**
- Consumes: `forecast.Params`, `forecast.DefaultParams`, `Params.Validate()` (Task 1)
- Produces: `settings.Open(path string) *Store`, `(*Store).Get() (forecast.Params, time.Time)` (waktu nol = belum pernah disimpan), `(*Store).Set(p forecast.Params) (time.Time, error)`.

- [ ] **Step 1: Tulis tes yang gagal** — `internal/settings/store_test.go`:

```go
package settings

import (
	"os"
	"path/filepath"
	"testing"

	"github.com/venturo-id/ai-forecast-be/internal/forecast"
)

func TestOpenMissingFileUsesDefaults(t *testing.T) {
	s := Open(filepath.Join(t.TempDir(), "settings.json"))
	p, at := s.Get()
	if p != forecast.DefaultParams || !at.IsZero() {
		t.Fatalf("file tidak ada → default & waktu nol, dapat %+v %v", p, at)
	}
}

func TestOpenCorruptFile(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	if err := os.WriteFile(path, []byte("{bukan json"), 0o600); err != nil {
		t.Fatal(err)
	}
	if p, _ := Open(path).Get(); p != forecast.DefaultParams {
		t.Fatalf("file rusak → default, dapat %+v", p)
	}
}

func TestOpenInvalidParams(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	raw := `{"params":{"return_threshold":5}}`
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	if p, _ := Open(path).Get(); p != forecast.DefaultParams {
		t.Fatalf("nilai di luar rentang → default, dapat %+v", p)
	}
}

func TestOpenFillsMissingFieldsFromDefaults(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	raw := `{"params":{"return_cut":3},"updated_at":"2026-10-15T08:00:00Z"}`
	if err := os.WriteFile(path, []byte(raw), 0o600); err != nil {
		t.Fatal(err)
	}
	p, at := Open(path).Get()
	want := forecast.DefaultParams
	want.ReturnCut = 3
	if p != want || at.IsZero() {
		t.Fatalf("field hilang diisi default, dapat %+v %v", p, at)
	}
}

func TestSetPersistsAndValidates(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	s := Open(path)

	bad := forecast.DefaultParams
	bad.Window = 0
	if _, err := s.Set(bad); err == nil {
		t.Fatal("Set params tidak valid harus error")
	}

	p := forecast.DefaultParams
	p.ReturnCut = 2
	at, err := s.Set(p)
	if err != nil || at.IsZero() {
		t.Fatalf("Set: %v %v", at, err)
	}
	if got, _ := Open(path).Get(); got != p {
		t.Fatalf("tidak tersimpan ke file, dapat %+v", got)
	}
}
```

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `go test ./internal/settings/`
Expected: FAIL — `undefined: Open`.

- [ ] **Step 3: Implementasi** — `internal/settings/store.go`:

```go
// Package settings menyimpan parameter aturan rekomendasi yang diatur admin.
// Disimpan di file JSON terpisah — database sumber klien tetap read-only.
package settings

import (
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sync"
	"time"

	"github.com/venturo-id/ai-forecast-be/internal/forecast"
)

type fileFormat struct {
	Params    forecast.Params `json:"params"`
	UpdatedAt time.Time       `json:"updated_at"`
}

// Store aman dipakai bersamaan oleh banyak request.
type Store struct {
	mu      sync.RWMutex
	path    string
	params  forecast.Params
	updated time.Time
}

// Open memuat file pengaturan. File tidak ada → DefaultParams. File rusak
// atau berisi nilai tidak valid → log peringatan + DefaultParams (server
// tetap jalan). Field yang hilang diisi dari DefaultParams.
func Open(path string) *Store {
	s := &Store{path: path, params: forecast.DefaultParams}

	raw, err := os.ReadFile(path)
	if errors.Is(err, os.ErrNotExist) {
		return s
	}
	if err != nil {
		log.Printf("pengaturan: baca %s: %v — memakai default", path, err)
		return s
	}

	file := fileFormat{Params: forecast.DefaultParams}
	if err := json.Unmarshal(raw, &file); err != nil {
		log.Printf("pengaturan: %s rusak: %v — memakai default", path, err)
		return s
	}
	if errs := file.Params.Validate(); errs != nil {
		log.Printf("pengaturan: %s tidak valid: %v — memakai default", path, errs)
		return s
	}
	s.params, s.updated = file.Params, file.UpdatedAt
	return s
}

// Get mengembalikan params aktif dan waktu simpan terakhir (nol = default).
func (s *Store) Get() (forecast.Params, time.Time) {
	s.mu.RLock()
	defer s.mu.RUnlock()
	return s.params, s.updated
}

// Set memvalidasi lalu menyimpan params ke file (tulis temp + rename agar
// file tidak pernah setengah tertulis).
func (s *Store) Set(p forecast.Params) (time.Time, error) {
	if errs := p.Validate(); errs != nil {
		return time.Time{}, fmt.Errorf("params tidak valid: %v", errs)
	}

	s.mu.Lock()
	defer s.mu.Unlock()

	now := time.Now().UTC().Truncate(time.Second)
	raw, err := json.MarshalIndent(fileFormat{Params: p, UpdatedAt: now}, "", "  ")
	if err != nil {
		return time.Time{}, err
	}
	tmp, err := os.CreateTemp(filepath.Dir(s.path), ".settings-*.json")
	if err != nil {
		return time.Time{}, err
	}
	defer os.Remove(tmp.Name())
	if _, err := tmp.Write(raw); err != nil {
		tmp.Close()
		return time.Time{}, err
	}
	if err := tmp.Close(); err != nil {
		return time.Time{}, err
	}
	if err := os.Rename(tmp.Name(), s.path); err != nil {
		return time.Time{}, err
	}

	s.params, s.updated = p, now
	return now, nil
}
```

- [ ] **Step 4: Jalankan tes**

Run: `go test ./internal/settings/`
Expected: PASS.

- [ ] **Step 5: Commit (repo BE)**

```bash
git add internal/settings/
git commit -m "feat(settings): store pengaturan rekomendasi di file JSON"
```

---

### Task 3: Endpoint `GET/PUT /api/v1/forecast/settings` + wiring

**Files:**
- Modify: `internal/config/config.go` (field `SettingsPath`, env `AI_FORECAST_SETTINGS`)
- Modify: `internal/httpapi/server.go` (`Server.settings`, signature `New`, route, CORS)
- Modify: `internal/httpapi/handlers.go` (`meta`, `recommendations`, `backtest` pakai store; handler baru)
- Modify: `cmd/api/main.go`
- Modify: `.gitignore`
- Modify: `docs/api.md`
- Test: `internal/httpapi/server_test.go`

**Interfaces:**
- Consumes: `settings.Open`, `(*Store).Get`, `(*Store).Set` (Task 2); `Params.Validate` (Task 1)
- Produces: `httpapi.New(data *forecast.Dataset, store *settings.Store, origins []string) http.Handler`; JSON `{ data: { params, defaults, updated_at: string|null } }`.

- [ ] **Step 1: Tulis tes yang gagal** — di `server_test.go`:

1a. Ubah `testHandler()` menjadi `testHandler(t *testing.T)` yang membuat store di temp dir, dan ganti semua pemanggilan `testHandler()` → `testHandler(t)`:

```go
func testHandler(t *testing.T) http.Handler {
	t.Helper()
	return testHandlerWithStore(settings.Open(filepath.Join(t.TempDir(), "settings.json")))
}

func testHandlerWithStore(store *settings.Store) http.Handler {
	qty := map[string]int{}
	// … isi lama (qty, rows, data) tidak berubah …
	return New(data, store, []string{"http://localhost:8002"})
}
```

Tambahkan import `"path/filepath"`, `"strings"`, dan `"github.com/venturo-id/ai-forecast-be/internal/settings"`.

1b. Tambahkan helper + tes:

```go
func put(t *testing.T, h http.Handler, target, body string) (*httptest.ResponseRecorder, envelope) {
	t.Helper()
	req := httptest.NewRequest(http.MethodPut, target, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	h.ServeHTTP(rec, req)
	var env envelope
	if err := json.Unmarshal(rec.Body.Bytes(), &env); err != nil {
		t.Fatalf("respons bukan envelope JSON: %v (%s)", err, rec.Body.String())
	}
	return rec, env
}

func paramsJSON(t *testing.T, p forecast.Params) string {
	t.Helper()
	raw, err := json.Marshal(p)
	if err != nil {
		t.Fatal(err)
	}
	return string(raw)
}

func TestSettingsRoundTrip(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	h := testHandlerWithStore(settings.Open(path))

	rec, body := get(t, h, "/api/v1/forecast/settings", nil)
	data := body.Data.(map[string]any)
	if rec.Code != http.StatusOK || data["updated_at"] != nil {
		t.Fatalf("GET awal: %d %v", rec.Code, data)
	}
	if data["params"].(map[string]any)["return_threshold"].(float64) != 0.15 {
		t.Fatalf("default return_threshold 0.15: %v", data)
	}

	p := forecast.DefaultParams
	p.ReturnCut = 2
	rec, body = put(t, h, "/api/v1/forecast/settings", paramsJSON(t, p))
	data = body.Data.(map[string]any)
	if rec.Code != http.StatusOK || data["updated_at"] == nil {
		t.Fatalf("PUT: %d %v", rec.Code, body)
	}
	if data["params"].(map[string]any)["return_cut"].(float64) != 2 {
		t.Fatalf("PUT harus mengembalikan params baru: %v", data)
	}
	if got, _ := settings.Open(path).Get(); got != p {
		t.Fatalf("tidak tersimpan: %+v", got)
	}
}

func TestSettingsValidation(t *testing.T) {
	path := filepath.Join(t.TempDir(), "settings.json")
	h := testHandlerWithStore(settings.Open(path))

	p := forecast.DefaultParams
	p.ReturnStreak = 5
	rec, body := put(t, h, "/api/v1/forecast/settings", paramsJSON(t, p))
	if rec.Code != http.StatusUnprocessableEntity || len(body.Errors["return_streak"]) == 0 {
		t.Fatalf("ingin 422 return_streak, dapat %d %v", rec.Code, body.Errors)
	}

	rec, _ = put(t, h, "/api/v1/forecast/settings", `{"window":"empat"}`)
	if rec.Code != http.StatusBadRequest {
		t.Fatalf("body tidak valid → 400, dapat %d", rec.Code)
	}
	if _, err := os.Stat(path); !os.IsNotExist(err) {
		t.Fatal("request gagal tidak boleh menulis file")
	}
}

func TestCORSAllowsPut(t *testing.T) {
	req := httptest.NewRequest(http.MethodOptions, "/api/v1/forecast/settings", nil)
	req.Header.Set("Origin", "http://localhost:8002")
	rec := httptest.NewRecorder()
	testHandler(t).ServeHTTP(rec, req)
	if !strings.Contains(rec.Header().Get("Access-Control-Allow-Methods"), "PUT") {
		t.Fatalf("CORS harus mengizinkan PUT: %v", rec.Header())
	}
}
```

Tambahkan import `"os"`.

- [ ] **Step 2: Jalankan, pastikan gagal**

Run: `go test ./internal/httpapi/`
Expected: FAIL kompilasi — `too many arguments in call to New`.

- [ ] **Step 3: Implementasi**

3a. `internal/config/config.go`: tambah field + env:

```go
	// SettingsPath file JSON pengaturan rekomendasi (ditulis lewat PUT
	// /api/v1/forecast/settings). Default settings.json di root repo.
	SettingsPath string
```

di `Load()`: `SettingsPath: getenv("AI_FORECAST_SETTINGS", "settings.json"),` dan perbarui komentar daftar env di atas `Load` (tambahkan `AI_FORECAST_SETTINGS`).

3b. `internal/httpapi/server.go`:

```go
// Server menyimpan dataset (immutable), pengaturan rekomendasi, dan
// konfigurasi HTTP.
type Server struct {
	data     *forecast.Dataset
	settings *settings.Store
	origins  []string
	loaded   time.Time
}

// New membangun handler HTTP lengkap dengan middleware.
func New(data *forecast.Dataset, store *settings.Store, origins []string) http.Handler {
	s := &Server{data: data, settings: store, origins: origins, loaded: time.Now()}
```

Tambahkan route setelah `backtest`:

```go
	mux.HandleFunc("GET /api/v1/forecast/settings", s.getSettings)
	mux.HandleFunc("PUT /api/v1/forecast/settings", s.putSettings)
```

CORS: `h.Set("Access-Control-Allow-Methods", "GET, PUT, OPTIONS")`. Ubah komentar paket (baris 1) dari "JSON API read-only" menjadi "JSON API (read-only kecuali pengaturan rekomendasi)". Import `settings`.

3c. `internal/httpapi/handlers.go`: ganti setiap `s.params` dengan `s.params()` dan tambahkan:

```go
// params: parameter rekomendasi aktif (dapat berubah lewat PUT settings).
func (s *Server) params() forecast.Params {
	p, _ := s.settings.Get()
	return p
}

func (s *Server) settingsData() map[string]any {
	p, updated := s.settings.Get()
	var updatedAt any
	if !updated.IsZero() {
		updatedAt = updated.Format(time.RFC3339)
	}
	return map[string]any{"params": p, "defaults": forecast.DefaultParams, "updated_at": updatedAt}
}

func (s *Server) getSettings(w http.ResponseWriter, _ *http.Request) {
	writeData(w, s.settingsData(), nil)
}

// putSettings mengganti SELURUH params (body = objek params lengkap).
func (s *Server) putSettings(w http.ResponseWriter, r *http.Request) {
	r.Body = http.MaxBytesReader(w, r.Body, 16<<10)
	dec := json.NewDecoder(r.Body)
	dec.DisallowUnknownFields()
	var p forecast.Params
	if err := dec.Decode(&p); err != nil {
		writeError(w, http.StatusBadRequest, "Body JSON tidak valid.", nil)
		return
	}
	if errs := p.Validate(); errs != nil {
		writeError(w, http.StatusUnprocessableEntity, "Parameter tidak valid.", errs)
		return
	}
	if _, err := s.settings.Set(p); err != nil {
		log.Printf("simpan pengaturan: %v", err)
		writeError(w, http.StatusInternalServerError, "Gagal menyimpan pengaturan.", nil)
		return
	}
	writeData(w, s.settingsData(), nil)
}
```

Import tambahan di `handlers.go`: `"encoding/json"`, `"log"`.

3d. `cmd/api/main.go`: import `internal/settings`, lalu sebelum `srv :=`:

```go
	store := settings.Open(cfg.SettingsPath)
	log.Printf("pengaturan rekomendasi: %s", cfg.SettingsPath)
```

dan `Handler: httpapi.New(data, store, cfg.CORSOrigins),`.

3e. `.gitignore`: tambahkan di bawah blok "Env lokal":

```
# Pengaturan rekomendasi yang disimpan admin (AI_FORECAST_SETTINGS)
settings.json
```

3f. `docs/api.md`: ubah baris 3 menjadi "Semua endpoint `GET` read-only, kecuali `PUT /api/v1/forecast/settings`. Base URL default `http://127.0.0.1:8080`."; tambah baris tabel endpoint:

```
| `/api/v1/forecast/settings` | `GET` → `{ params, defaults, updated_at }` (null = belum pernah disimpan); `PUT` body = objek `params` lengkap → bentuk sama, 422 per field bila tidak valid, 400 bila JSON tidak valid |
```

dan bagian baru sebelum "### Summary":

```markdown
### Params (pengaturan rekomendasi)

| Field | Default | Rentang | Arti |
|---|---|---|---|
| `window` | 4 | 1–12 | observasi dasar median |
| `min_observations` | 3 | 1–`window` | minimum sebelum memakai riwayat toko × produk |
| `return_threshold` | 0.15 | 0.01–1 | rasio BS ÷ kiriman sebelumnya yang dianggap retur tinggi |
| `return_window` | 3 | 1–8 | observasi andal terakhir untuk rasio retur |
| `return_streak` | 1 | 1–`return_window` | kunjungan terakhir beruntun yang masing-masing di atas ambang |
| `return_cut_unit` | `pcs` | `pcs` \| `persen` | satuan pengurangan |
| `return_cut` | 1 | pcs 1–50 (bulat); persen 0.01–0.9 | besar pengurangan (persen dari dasar, minimal 1 pcs) |
| `stockout_bonus` | 1 | 0–20 | tambahan pcs saat sinyal habis |
| `max_step_ratio` | 0.3 | 0.05–1 | batas perubahan per kunjungan (rasio kiriman terakhir) |
| `min_step` | 2 | 0–50 | batas perubahan minimum (pcs) |

Disimpan di `AI_FORECAST_SETTINGS` (default `settings.json`); file rusak/tidak valid → default + log peringatan.
```

Baris 61 (`Aturan: … parameter di meta.params …`) → "Aturan: studi kelayakan §4.2, parameter aktif di `meta.params` dan `/settings` (contoh, belum dioptimasi)."

- [ ] **Step 4: Jalankan semua tes + build**

Run: `go test ./... && go build ./...`
Expected: PASS, build sukses.

- [ ] **Step 5: Smoke test manual**

```bash
AI_FORECAST_SETTINGS=/tmp/ai-forecast-settings.json go run ./cmd/api &
sleep 3
curl -s localhost:8080/api/v1/forecast/settings
curl -s -X PUT localhost:8080/api/v1/forecast/settings -H 'Content-Type: application/json' \
  -d '{"window":4,"min_observations":3,"return_threshold":0.2,"return_window":3,"return_streak":2,"return_cut_unit":"pcs","return_cut":2,"stockout_bonus":1,"max_step_ratio":0.3,"min_step":2}'
cat /tmp/ai-forecast-settings.json
kill %1; rm /tmp/ai-forecast-settings.json
```

Expected: GET → `updated_at: null`; PUT → 200 dengan `return_cut: 2`; file berisi params.

- [ ] **Step 6: Commit (repo BE)**

```bash
git add internal/config/config.go internal/httpapi/ cmd/api/main.go .gitignore docs/api.md
git commit -m "feat(api): endpoint GET/PUT pengaturan rekomendasi"
```

---

## Bagian B — Frontend (`/Users/user/Documents/Claude/Projects/ai-forecast/ai-forecast-fe`)

### Task 4: Tipe, aturan FE berparameter, schema form

**Files:**
- Modify: `src/types/forecast.ts`
- Modify: `src/sections/forecast/forecast-utils.ts`
- Create: `src/sections/forecast/recommendation-params-schema.ts`

**Interfaces:**
- Produces:
  - `type ReturnCutUnit = 'pcs' | 'persen'`; `type RecommendationParams = { window; minObservations; returnThreshold; returnWindow; returnStreak; returnCutUnit; returnCut; stockoutBonus; maxStepRatio; minStep }` (number kecuali `returnCutUnit`); `type RecommendationSettings = { params: RecommendationParams; defaults: RecommendationParams; updatedAt: string | null }`.
  - `DEFAULT_REC_PARAMS: RecommendationParams` (menggantikan `REC_PARAMS`), `computeRecommendations(cells, asOf, params = DEFAULT_REC_PARAMS)`, `fReturnCut(params): string`, `signalLabel(signal, params): string`.
  - `recParamsFormSchema`, `type RecParamsFormValues`, `toFormValues(params)`, `toParams(values)`, `parseStoredSettings(raw: string | null): { params; updatedAt } | null`, `API_FIELD_TO_FORM: Record<string, keyof RecParamsFormValues>`.

- [ ] **Step 1: Tipe** — tambahkan di `src/types/forecast.ts` setelah tipe `Recommendation`:

```ts
export type ReturnCutUnit = 'pcs' | 'persen';

/** Parameter aturan baseline — cermin `Params` di ai-forecast-be. */
export type RecommendationParams = {
  /** Jumlah observasi terakhir yang dipakai sebagai dasar median. */
  window: number;
  /** Minimum observasi sebelum memakai riwayat toko × produk sendiri. */
  minObservations: number;
  /** Ambang rasio retur (0–1) yang memicu penurunan. */
  returnThreshold: number;
  /** Observasi andal terakhir untuk menghitung rasio retur. */
  returnWindow: number;
  /** Kunjungan terakhir beruntun yang masing-masing harus di atas ambang. */
  returnStreak: number;
  returnCutUnit: ReturnCutUnit;
  /** pcs (bulat) atau rasio dari dasar (0–1) sesuai `returnCutUnit`. */
  returnCut: number;
  /** Tambahan pcs saat sinyal habis. */
  stockoutBonus: number;
  /** Batas perubahan per kunjungan: max(minStep, rasio × kiriman terakhir). */
  maxStepRatio: number;
  minStep: number;
};

export type RecommendationSettings = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  /** ISO; null = belum pernah disimpan (memakai default). */
  updatedAt: string | null;
};
```

- [ ] **Step 2: `forecast-utils.ts`**

2a. Tambahkan `RecommendationParams` ke `import type` dari `src/types/forecast`. Ganti blok `REC_PARAMS` dengan:

```ts
/** Default aturan baseline — sama dengan DefaultParams di backend. */
export const DEFAULT_REC_PARAMS: RecommendationParams = {
  window: 4,
  minObservations: 3,
  returnThreshold: 0.15,
  returnWindow: 3,
  returnStreak: 1,
  returnCutUnit: 'pcs',
  returnCut: 1,
  stockoutBonus: 1,
  maxStepRatio: 0.3,
  minStep: 2,
};
```

2b. Di bagian Rekomendasi, ubah signature + komentar dan ganti seluruh pemakaian `REC_PARAMS.` di fungsi dengan `params.`:

```ts
/**
 * Aturan baseline (studi kelayakan §4.2) untuk kunjungan berikutnya, memakai
 * data s.d. `asOf` saja (walk-forward). Harus identik dengan recommend.go.
 */
export function computeRecommendations(
  cells: VisitCell[],
  asOf: string,
  params: RecommendationParams = DEFAULT_REC_PARAMS
): Recommendation[] {
```

2c. Ganti `observationsOf` dengan:

```ts
  const reliableObs = (pairCells: VisitCell[]) =>
    pairCells.filter((c) => c.reliable && c.estSold !== null);
  const observationsOf = (pairCells: VisitCell[]) => reliableObs(pairCells).slice(-params.window);
```

2d. Di dalam loop, ganti

```ts
    const obs = observationsOf(pairCells);
    const recentObs = obs.slice(-3);
    const obsBasis = sum(recentObs.map((c) => c.prevKirim!));
    const returnRate = obsBasis ? sum(recentObs.map((c) => c.bs)) / obsBasis : null;
```

dengan

```ts
    const allObs = reliableObs(pairCells);
    const obs = allObs.slice(-params.window);
    const retObs = allObs.slice(-params.returnWindow);
    const obsBasis = sum(retObs.map((c) => c.prevKirim!));
    const returnRate = obsBasis ? sum(retObs.map((c) => c.bs)) / obsBasis : null;
```

2e. Ganti blok adjustment:

```ts
    let adjustment = 0;
    const lastTwo = obs.slice(-2);
    if (lastTwo.length === 2 && lastTwo.every((c) => c.bs === 0 && c.stock === 0)) {
      adjustment += params.stockoutBonus;
      signals.push('habis');
    }
    if (
      returnRate !== null &&
      returnRate > params.returnThreshold &&
      returnStreakOk(retObs, params)
    ) {
      adjustment -= returnCut(base, params);
      signals.push('retur-tinggi');
    }
```

2f. Tambahkan helper di atas `computeRecommendations`:

```ts
/** `returnStreak` observasi terakhir masing-masing di atas ambang (≤ 1 = cukup rasio agregat). */
const returnStreakOk = (retObs: VisitCell[], params: RecommendationParams) =>
  params.returnStreak <= 1 ||
  (retObs.length >= params.returnStreak &&
    retObs
      .slice(-params.returnStreak)
      .every((c) => c.bs / c.prevKirim! > params.returnThreshold));

/** Pengurangan saat retur tinggi; persen dari dasar, minimal 1 pcs. */
const returnCut = (base: number, params: RecommendationParams) =>
  params.returnCutUnit === 'persen'
    ? Math.max(1, Math.round(base * params.returnCut))
    : params.returnCut;
```

2g. Di bagian Label, tambahkan:

```ts
/** "1 pcs" / "10%" */
export const fReturnCut = (params: RecommendationParams) =>
  params.returnCutUnit === 'persen'
    ? `${Math.round(params.returnCut * 100)}%`
    : `${params.returnCut} pcs`;

/** Label sinyal dengan besaran dari params aktif. */
export function signalLabel(signal: RecommendationSignal, params: RecommendationParams) {
  if (signal === 'habis') return `Sinyal habis (+${params.stockoutBonus})`;
  if (signal === 'retur-tinggi') return `Retur tinggi (−${fReturnCut(params)})`;
  return SIGNAL_LABEL[signal];
}
```

- [ ] **Step 3: Schema** — buat `src/sections/forecast/recommendation-params-schema.ts`:

```ts
import type { RecommendationParams } from 'src/types/forecast';

import { z } from 'zod';

// ----------------------------------------------------------------------
// Schema form pengaturan rekomendasi. Persen ditampilkan sebagai bilangan
// bulat (15 = 15%); dikonversi ke rasio di toParams. Rentang = Params.Validate
// di ai-forecast-be.

const int = (min: number, max: number) =>
  z
    .number({ message: 'Wajib diisi.' })
    .int('Harus bilangan bulat.')
    .min(min, `Minimal ${min}.`)
    .max(max, `Maksimal ${max}.`);

export const recParamsFormSchema = z
  .object({
    returnThresholdPct: int(1, 100),
    returnWindow: int(1, 8),
    returnStreak: int(1, 8),
    returnCutUnit: z.enum(['pcs', 'persen']),
    returnCut: int(1, 90),
    stockoutBonus: int(0, 20),
    window: int(1, 12),
    minObservations: int(1, 12),
    maxStepPct: int(5, 100),
    minStep: int(0, 50),
  })
  .superRefine((v, ctx) => {
    if (v.returnStreak > v.returnWindow) {
      ctx.addIssue({
        code: 'custom',
        path: ['returnStreak'],
        message: 'Tidak boleh melebihi jumlah kunjungan untuk rasio retur.',
      });
    }
    if (v.minObservations > v.window) {
      ctx.addIssue({
        code: 'custom',
        path: ['minObservations'],
        message: 'Tidak boleh melebihi jumlah kunjungan dasar.',
      });
    }
    if (v.returnCutUnit === 'pcs' && v.returnCut > 50) {
      ctx.addIssue({ code: 'custom', path: ['returnCut'], message: 'Maksimal 50 pcs.' });
    }
  });

export type RecParamsFormValues = z.infer<typeof recParamsFormSchema>;

const pct = (ratio: number) => Math.round(ratio * 100);

export const toFormValues = (p: RecommendationParams): RecParamsFormValues => ({
  returnThresholdPct: pct(p.returnThreshold),
  returnWindow: p.returnWindow,
  returnStreak: p.returnStreak,
  returnCutUnit: p.returnCutUnit,
  returnCut: p.returnCutUnit === 'persen' ? pct(p.returnCut) : p.returnCut,
  stockoutBonus: p.stockoutBonus,
  window: p.window,
  minObservations: p.minObservations,
  maxStepPct: pct(p.maxStepRatio),
  minStep: p.minStep,
});

export const toParams = (v: RecParamsFormValues): RecommendationParams => ({
  window: v.window,
  minObservations: v.minObservations,
  returnThreshold: v.returnThresholdPct / 100,
  returnWindow: v.returnWindow,
  returnStreak: v.returnStreak,
  returnCutUnit: v.returnCutUnit,
  returnCut: v.returnCutUnit === 'persen' ? v.returnCut / 100 : v.returnCut,
  stockoutBonus: v.stockoutBonus,
  maxStepRatio: v.maxStepPct / 100,
  minStep: v.minStep,
});

/** Kunci error 422 backend (snake_case) → field form. */
export const API_FIELD_TO_FORM: Record<string, keyof RecParamsFormValues> = {
  window: 'window',
  min_observations: 'minObservations',
  return_threshold: 'returnThresholdPct',
  return_window: 'returnWindow',
  return_streak: 'returnStreak',
  return_cut_unit: 'returnCutUnit',
  return_cut: 'returnCut',
  stockout_bonus: 'stockoutBonus',
  max_step_ratio: 'maxStepPct',
  min_step: 'minStep',
};

const storedSchema = z.object({
  params: z.object({
    window: z.number(),
    minObservations: z.number(),
    returnThreshold: z.number(),
    returnWindow: z.number(),
    returnStreak: z.number(),
    returnCutUnit: z.enum(['pcs', 'persen']),
    returnCut: z.number(),
    stockoutBonus: z.number(),
    maxStepRatio: z.number(),
    minStep: z.number(),
  }),
  updatedAt: z.string().nullable(),
});

export type StoredRecSettings = z.infer<typeof storedSchema>;

/** Isi localStorage → settings tervalidasi, atau null bila kosong/rusak/di luar rentang. */
export function parseStoredSettings(raw: string | null): StoredRecSettings | null {
  if (!raw) return null;
  try {
    const stored = storedSchema.parse(JSON.parse(raw));
    return recParamsFormSchema.safeParse(toFormValues(stored.params)).success ? stored : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Type-check** — pemakai lama `REC_PARAMS` akan error (diperbaiki di Task 6). Untuk memastikan hanya itu yang gagal:

Run: `yarn tsc:check 2>&1 | grep "error TS"`
Expected: error hanya di `forecast-cells.tsx`, `recommendation-method.tsx`, `store-list-view.tsx` (`REC_PARAMS` tidak ada). Tidak ada error lain.

- [ ] **Step 5: Jangan commit dulu** — Task 4–6 di-commit bersama di akhir Task 6 (build baru hijau di sana).

---

### Task 5: Lapisan API pengaturan

**Files:**
- Modify: `src/lib/api/endpoints.ts`
- Modify: `src/lib/api/forecast.ts`

**Interfaces:**
- Consumes: `RecommendationParams`, `RecommendationSettings` (Task 4)
- Produces: `endpoints.forecast.settings`, `forecastKeys.settings`, `getForecastSettings(options?)`, `updateForecastSettings(params: RecommendationParams): Promise<RecommendationSettings>`.

- [ ] **Step 1: Endpoint** — tambah di `endpoints.forecast`: `settings: 'api/v1/forecast/settings',`

- [ ] **Step 2: Schema & fetcher** — di `src/lib/api/forecast.ts`:

Tambahkan `RecommendationParams` dan `RecommendationSettings` ke `import type`. Setelah `forecastRecommendationsSchema`, tambahkan:

```ts
const recParamsSchema = z
  .object({
    window: z.number(),
    min_observations: z.number(),
    return_threshold: z.number(),
    return_window: z.number(),
    return_streak: z.number(),
    return_cut_unit: z.enum(['pcs', 'persen']),
    return_cut: z.number(),
    stockout_bonus: z.number(),
    max_step_ratio: z.number(),
    min_step: z.number(),
  })
  .transform(
    (p): RecommendationParams => ({
      window: p.window,
      minObservations: p.min_observations,
      returnThreshold: p.return_threshold,
      returnWindow: p.return_window,
      returnStreak: p.return_streak,
      returnCutUnit: p.return_cut_unit,
      returnCut: p.return_cut,
      stockoutBonus: p.stockout_bonus,
      maxStepRatio: p.max_step_ratio,
      minStep: p.min_step,
    })
  );

export const forecastSettingsSchema = z
  .object({ params: recParamsSchema, defaults: recParamsSchema, updated_at: z.string().nullable() })
  .transform(
    (s): RecommendationSettings => ({
      params: s.params,
      defaults: s.defaults,
      updatedAt: s.updated_at,
    })
  );

const toRawParams = (p: RecommendationParams) => ({
  window: p.window,
  min_observations: p.minObservations,
  return_threshold: p.returnThreshold,
  return_window: p.returnWindow,
  return_streak: p.returnStreak,
  return_cut_unit: p.returnCutUnit,
  return_cut: p.returnCut,
  stockout_bonus: p.stockoutBonus,
  max_step_ratio: p.maxStepRatio,
  min_step: p.minStep,
});
```

Di `forecastKeys` tambahkan `settings: ['forecast', 'settings'] as const,`. Di akhir file:

```ts
export async function getForecastSettings(options: FetchOptions = {}) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.settings, options);
  return forecastSettingsSchema.parse(data);
}

/** PUT params lengkap; 422 → ApiError.errors per field (snake_case). */
export async function updateForecastSettings(params: RecommendationParams) {
  const { data } = await apiFetch<unknown>(endpoints.forecast.settings, {
    method: 'put',
    body: toRawParams(params),
  });
  return forecastSettingsSchema.parse(data);
}
```

- [ ] **Step 3: Type-check** — Run: `yarn tsc:check 2>&1 | grep "error TS"` → Expected: hanya error `REC_PARAMS` yang sama seperti Task 4.

---

### Task 6: Hook `useRecommendationParams` + pemakai params aktif

**Files:**
- Create: `src/sections/forecast/use-recommendation-params.ts`
- Modify: `src/sections/forecast/use-forecast-data.ts` (`useForecastRecommendations`)
- Modify: `src/sections/forecast/forecast-cells.tsx` (`ReturnRateCell` prop `threshold`)
- Modify: `src/sections/forecast/view/product-list-view.tsx`, `src/sections/forecast/view/store-list-view.tsx`
- Modify: `src/sections/forecast/recommendation-method.tsx`
- Modify: `src/sections/forecast/recommendation-table.tsx`

**Interfaces:**
- Consumes: Task 4 & 5.
- Produces: `useRecommendationParams(): { params; defaults; updatedAt; loading; error; save(params): Promise<void>; saving }`.

> Catatan: hook ditaruh di file sendiri (bukan `use-forecast-data.ts` seperti di spec) agar tidak terjadi import melingkar — `use-forecast-data.ts` memakai hook ini.

- [ ] **Step 1: Hook** — `src/sections/forecast/use-recommendation-params.ts`:

```ts
'use client';

import type { RecommendationParams } from 'src/types/forecast';

import { useSyncExternalStore } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { CONFIG } from 'src/global-config';
import { forecastKeys, getForecastSettings, updateForecastSettings } from 'src/lib/api';

import { DEFAULT_REC_PARAMS } from './forecast-utils';
import { parseStoredSettings, type StoredRecSettings } from './recommendation-params-schema';

// ----------------------------------------------------------------------
// Parameter aturan rekomendasi aktif, dua sumber (sama seperti
// use-forecast-data):
// - 'api'      → GET/PUT /api/v1/forecast/settings (berlaku untuk semua pengguna).
// - 'simulasi' → localStorage browser ini; fallback memori bila storage diblokir.

const IS_API = CONFIG.forecastSource === 'api';
const STORAGE_KEY = 'ai-forecast:rec-params';

const DEFAULT_STORED: StoredRecSettings = { params: DEFAULT_REC_PARAMS, updatedAt: null };

let memory: string | null = null;
let snapshot: { raw: string | null; value: StoredRecSettings } | null = null;
const listeners = new Set<() => void>();

function readRaw() {
  try {
    return window.localStorage.getItem(STORAGE_KEY) ?? memory;
  } catch {
    return memory;
  }
}

function getSnapshot(): StoredRecSettings {
  const raw = readRaw();
  // Objek stabil selama isi storage sama — syarat useSyncExternalStore.
  if (!snapshot || snapshot.raw !== raw) {
    snapshot = { raw, value: parseStoredSettings(raw) ?? DEFAULT_STORED };
  }
  return snapshot.value;
}

const getServerSnapshot = () => DEFAULT_STORED;

function subscribe(listener: () => void) {
  listeners.add(listener);
  const onStorage = (event: StorageEvent) => {
    if (event.key === STORAGE_KEY) listener();
  };
  window.addEventListener('storage', onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener('storage', onStorage);
  };
}

function writeStored(value: StoredRecSettings) {
  memory = JSON.stringify(value);
  try {
    window.localStorage.setItem(STORAGE_KEY, memory);
  } catch {
    // Storage diblokir (private window) — tetap berlaku di memori sesi ini.
  }
  listeners.forEach((listener) => listener());
}

export type RecommendationParamsResult = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  updatedAt: string | null;
  loading: boolean;
  error: Error | null;
  save: (params: RecommendationParams) => Promise<void>;
  saving: boolean;
};

export function useRecommendationParams(): RecommendationParamsResult {
  const queryClient = useQueryClient();
  const local = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const query = useQuery({
    queryKey: forecastKeys.settings,
    queryFn: ({ signal }) => getForecastSettings({ signal }),
    enabled: IS_API,
    staleTime: 60_000,
  });

  const mutation = useMutation({
    mutationFn: updateForecastSettings,
    onSuccess: (data) => {
      queryClient.setQueryData(forecastKeys.settings, data);
      // Rekomendasi & backtest dihitung ulang server dengan params baru.
      return queryClient.invalidateQueries({ queryKey: forecastKeys.all });
    },
  });

  if (!IS_API) {
    return {
      params: local.params,
      defaults: DEFAULT_REC_PARAMS,
      updatedAt: local.updatedAt,
      loading: false,
      error: null,
      saving: false,
      save: async (params) => writeStored({ params, updatedAt: new Date().toISOString() }),
    };
  }

  return {
    params: query.data?.params ?? DEFAULT_REC_PARAMS,
    defaults: query.data?.defaults ?? DEFAULT_REC_PARAMS,
    updatedAt: query.data?.updatedAt ?? null,
    loading: query.isPending,
    error: query.error,
    saving: mutation.isPending,
    save: async (params) => {
      await mutation.mutateAsync(params);
    },
  };
}
```

- [ ] **Step 2: `useForecastRecommendations`** — di `use-forecast-data.ts` import `useRecommendationParams` dari `./use-recommendation-params`, lalu:

```ts
export function useForecastRecommendations(
  params: { asOf: string; nit?: string | null; product?: string | null },
  enabled = true
) {
  const { params: recParams } = useRecommendationParams();

  return useForecastSource<Recommendation[]>(
    // Mode simulasi: params aturan ikut key agar hasil dihitung ulang saat
    // pengaturan berubah. Mode api: server memakai params tersimpan.
    IS_API
      ? forecastKeys.recommendations(params)
      : [...forecastKeys.recommendations(params), recParams],
    (signal) => getForecastRecommendations(params, { signal }),
    () =>
      computeRecommendations(
        filterCells(forecastCells, {
          nit: params.nit ?? null,
          product: (params.product ?? null) as ForecastFilters['product'],
        }),
        params.asOf,
        recParams
      ),
    enabled
  );
}
```

- [ ] **Step 3: `ReturnRateCell`** — di `forecast-cells.tsx` hapus import `REC_PARAMS`, ubah:

```tsx
/**
 * Rasio retur; di atas ambang aturan rekomendasi (`threshold`, dari
 * pengaturan aktif) ditandai pill + ikon, bukan warna saja.
 */
export function ReturnRateCell({ value, threshold }: { value: number | null; threshold: number }) {
  const high = value !== null && value > threshold;
```

- [ ] **Step 4: Views** — di `product-list-view.tsx` dan `store-list-view.tsx`:
  - import `useRecommendationParams` dari `../use-recommendation-params`; di awal komponen view: `const { params: recParams } = useRecommendationParams();`
  - `<ReturnRateCell value={row.returnRate} threshold={recParams.returnThreshold} />`
  - `store-list-view.tsx`: hapus `REC_PARAMS` dari import `../forecast-utils`; ganti `REC_PARAMS.returnThreshold` (di `useMemo` stats dan caption) dengan `recParams.returnThreshold`, dan tambahkan `recParams.returnThreshold` ke dependency array `useMemo` tersebut (`[rows, recParams.returnThreshold]`).

- [ ] **Step 5: `recommendation-method.tsx`** — jadikan langkah dinamis + link ke Pengaturan:

```tsx
import type { RecommendationParams } from 'src/types/forecast';

import Box from '@mui/material/Box';
import Link from '@mui/material/Link';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { paths } from 'src/routes/paths';
import { RouterLink } from 'src/routes/components';

import { fPercent } from 'src/utils/format-number';

import { Iconify } from 'src/components/iconify';

import { fReturnCut } from './forecast-utils';
import { useRecommendationParams } from './use-recommendation-params';

// ----------------------------------------------------------------------
// Penjelasan aturan baseline (studi kelayakan §4.2) agar rekomendasi bisa
// dijelaskan ke sales. Angka = pengaturan aktif (halaman Pengaturan).

const steps = (p: RecommendationParams) => [
  `Dasar: median estimasi terjual (rumus B: kiriman kunjungan sebelumnya − BS hari ini) dari ${p.window} kunjungan terakhir.`,
  `Riwayat < ${p.minObservations} observasi → fallback ke median produk di wilayah (kec) yang sama, lalu median semua wilayah. Kepercayaan rendah.`,
  `Sinyal habis: BS = 0 dan STOCK = 0 pada 2 kunjungan terakhir → +${p.stockoutBonus} pcs untuk menguji permintaan yang tersensor.`,
  `Sinyal retur: rasio BS > ${fPercent(p.returnThreshold, 0)} pada ${p.returnWindow} kunjungan terakhir${
    p.returnStreak > 1
      ? ` dan ${p.returnStreak} kunjungan terakhir berturut-turut masing-masing di atas batas`
      : ''
  } → −${fReturnCut(p)}${p.returnCutUnit === 'persen' ? ' dari dasar (min. 1 pcs)' : ''}.`,
  `Batas perubahan per kunjungan: maks. ±${p.minStep} pcs atau ±${fPercent(p.maxStepRatio, 0)} dari kiriman terakhir (mana yang lebih besar).`,
  'Produk volume sangat kecil (mpkt, np, tf, jasuke, sisir2) dan kiriman pencilan tidak direkomendasikan otomatis.',
];

export function RecommendationMethod() {
  const { params } = useRecommendationParams();

  return (
    // … Accordion & AccordionSummary sama seperti sebelumnya …
      <AccordionDetails>
        <Box component="ol" sx={{ pl: 2.5, gap: 1, display: 'flex', flexDirection: 'column' }}>
          {steps(params).map((step) => (
            <Typography key={step} component="li" variant="body2" sx={{ color: 'text.secondary' }}>
              {step}
            </Typography>
          ))}
        </Box>
        <Typography variant="caption" sx={{ mt: 2, display: 'block', color: 'text.disabled' }}>
          Aturan baseline mengikuti studi kelayakan §4.2. Parameternya contoh dan belum dioptimasi;
          ubah di{' '}
          <Link component={RouterLink} href={paths.dashboard.settings} color="inherit" underline="always">
            Pengaturan
          </Link>
          . Arti BS dan STOCK juga belum dikonfirmasi klien.
        </Typography>
      </AccordionDetails>
    // …
  );
}
```

(Bagian `Accordion`/`AccordionSummary` tidak berubah — salin dari file lama.) `paths.dashboard.settings` dibuat di Task 7 Step 1; kerjakan Step 1 Task 7 sekarang bila tsc mengeluh, atau tambahkan `settings: '/dashboard/pengaturan',` ke `paths.dashboard` di langkah ini.

- [ ] **Step 6: `recommendation-table.tsx`** — import `signalLabel` (ganti `SIGNAL_LABEL`) dari `./forecast-utils` dan `useRecommendationParams`; di komponen tabel: `const { params: recParams } = useRecommendationParams();`; ganti `{SIGNAL_LABEL[signal]}` → `{signalLabel(signal, recParams)}`.

- [ ] **Step 7: Gate**

Run: `yarn lint:fix && yarn fm:fix && yarn tsc:check && yarn lint`
Expected: 0 error.

- [ ] **Step 8: Paritas default (mode simulasi)** — sebelum Task 4 mulai, catat jumlah naik/turun/tetap di kartu ringkasan halaman Rekomendasi Stok (`yarn dev`, `http://localhost:8002/dashboard/rekomendasi-stok`, filter default). Setelah langkah ini, angka yang sama harus muncul. Cek juga di DevTools: `localStorage.setItem('ai-forecast:rec-params', '{rusak')` lalu reload → halaman tetap jalan dengan default.

- [ ] **Step 9: Commit (repo FE)**

```bash
git add src/types/forecast.ts src/sections/forecast/forecast-utils.ts \
  src/sections/forecast/recommendation-params-schema.ts src/lib/api/endpoints.ts \
  src/lib/api/forecast.ts src/sections/forecast/use-recommendation-params.ts \
  src/sections/forecast/use-forecast-data.ts src/sections/forecast/forecast-cells.tsx \
  src/sections/forecast/view/product-list-view.tsx src/sections/forecast/view/store-list-view.tsx \
  src/sections/forecast/recommendation-method.tsx src/sections/forecast/recommendation-table.tsx \
  src/routes/paths.ts
git commit -m "feat(forecast): aturan rekomendasi memakai parameter yang bisa diatur"
```

---

### Task 7: Halaman Pengaturan

**Files:**
- Modify: `src/routes/paths.ts` (bila belum di Task 6)
- Modify: `src/layouts/nav-config-dashboard.tsx`
- Create: `src/app/dashboard/pengaturan/page.tsx`
- Create: `src/sections/forecast/view/settings-view.tsx`
- Create: `src/sections/forecast/settings-params-form.tsx`

**Interfaces:**
- Consumes: `useRecommendationParams` (Task 6), schema (Task 4), `useForecastStores`, `DEFAULT_FILTERS`, `ApiError`.
- Produces: `SettingsView`, `SettingsParamsForm`.

- [ ] **Step 1: Route + nav**
  - `paths.dashboard.settings: '/dashboard/pengaturan'`.
  - `nav-config-dashboard.tsx`: grup baru di akhir array:

```tsx
  {
    subheader: 'Sistem',
    items: [
      {
        title: 'Pengaturan',
        path: paths.dashboard.settings,
        icon: <Iconify icon="carbon:settings-adjust" />,
      },
    ],
  },
```

- [ ] **Step 2: Page** — `src/app/dashboard/pengaturan/page.tsx`:

```tsx
import type { Metadata } from 'next';

import { SettingsView } from 'src/sections/forecast/view/settings-view';

// ----------------------------------------------------------------------

export const metadata: Metadata = { title: 'Pengaturan' };

export default function Page() {
  return <SettingsView />;
}
```

- [ ] **Step 3: View** — `src/sections/forecast/view/settings-view.tsx`:

```tsx
'use client';

import { useMemo } from 'react';

import { DEFAULT_FILTERS } from '../forecast-utils';
import { ForecastDataState } from '../forecast-data-state';
import { ForecastPageHeader } from '../forecast-page-header';
import { useForecastStores } from '../use-forecast-data';
import { SettingsParamsForm } from '../settings-params-form';
import { ForecastSimulationAlert } from '../forecast-simulation-alert';
import { useRecommendationParams } from '../use-recommendation-params';

// ----------------------------------------------------------------------

export function SettingsView() {
  const settings = useRecommendationParams();
  const stores = useForecastStores(DEFAULT_FILTERS);

  // Rata-rata interval kunjungan semua toko — untuk perkiraan hari di form.
  const avgInterval = useMemo(() => {
    const values = (stores.data ?? [])
      .map((row) => row.avgInterval)
      .filter((v): v is number => v !== null);
    return values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
  }, [stores.data]);

  return (
    <>
      <ForecastPageHeader
        title="Pengaturan Rekomendasi"
        icon="carbon:settings-adjust"
        description="Atur kapan dan seberapa besar rekomendasi stok diturunkan saat retur (BS) tinggi."
      />

      <ForecastSimulationAlert />

      <ForecastDataState error={settings.error} />

      {!settings.loading && (
        <SettingsParamsForm
          params={settings.params}
          defaults={settings.defaults}
          updatedAt={settings.updatedAt}
          avgInterval={avgInterval}
          saving={settings.saving}
          onSave={settings.save}
        />
      )}
    </>
  );
}
```

Sebelum menulis, buka `forecast-data-state.tsx` dan `forecast-simulation-alert.tsx`: bila `ForecastDataState` butuh `children` atau prop lain yang wajib, sesuaikan pemakaian di atas dengan pola di `recommendation-view.tsx`.

- [ ] **Step 4: Form** — `src/sections/forecast/settings-params-form.tsx`:

```tsx
import type { RecommendationParams } from 'src/types/forecast';
import type { RecParamsFormValues } from './recommendation-params-schema';

import { useState, useEffect } from 'react';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm, useWatch } from 'react-hook-form';

import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import Alert from '@mui/material/Alert';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import Dialog from '@mui/material/Dialog';
import MenuItem from '@mui/material/MenuItem';
import Snackbar from '@mui/material/Snackbar';
import Accordion from '@mui/material/Accordion';
import Typography from '@mui/material/Typography';
import CardHeader from '@mui/material/CardHeader';
import DialogTitle from '@mui/material/DialogTitle';
import CardContent from '@mui/material/CardContent';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import AccordionSummary from '@mui/material/AccordionSummary';
import AccordionDetails from '@mui/material/AccordionDetails';

import { fNumber } from 'src/utils/format-number';

import { ApiError } from 'src/lib/api';
import { CONFIG } from 'src/global-config';

import { Iconify } from 'src/components/iconify';
import { Form, Field } from 'src/components/hook-form';

import { fDate } from './forecast-utils';
import {
  toParams,
  toFormValues,
  API_FIELD_TO_FORM,
  recParamsFormSchema,
} from './recommendation-params-schema';

// ----------------------------------------------------------------------

const IS_API = CONFIG.forecastSource === 'api';

type Props = {
  params: RecommendationParams;
  defaults: RecommendationParams;
  updatedAt: string | null;
  /** Rata-rata interval kunjungan (hari) untuk perkiraan; null bila belum ada. */
  avgInterval: number | null;
  saving: boolean;
  onSave: (params: RecommendationParams) => Promise<void>;
};

/** Kalimat aturan retur dari nilai form (pratinjau). */
function rulePreview(v: RecParamsFormValues, avgInterval: number | null) {
  const days = avgInterval ? ` (≈ ${fNumber(v.returnWindow * avgInterval, 0)} hari)` : '';
  const streak =
    v.returnStreak > 1
      ? `, dan ${v.returnStreak} kunjungan terakhir berturut-turut masing-masing di atas batas`
      : '';
  const cut =
    v.returnCutUnit === 'persen' ? `${v.returnCut}% dari dasar (min. 1 pcs)` : `${v.returnCut} pcs`;
  return `Jika retur > ${v.returnThresholdPct}% dari kiriman pada ${v.returnWindow} kunjungan terakhir${days}${streak}, rekomendasi dikurangi ${cut}.`;
}

export function SettingsParamsForm({
  params,
  defaults,
  updatedAt,
  avgInterval,
  saving,
  onSave,
}: Props) {
  const methods = useForm<RecParamsFormValues>({
    resolver: zodResolver(recParamsFormSchema),
    defaultValues: toFormValues(params),
  });
  const { reset, setError, control, handleSubmit } = methods;

  // Params tersimpan berubah (muat api / simpan) → form ikut.
  useEffect(() => {
    reset(toFormValues(params));
  }, [params, reset]);

  const values = useWatch({ control }) as RecParamsFormValues;
  const [pending, setPending] = useState<RecParamsFormValues | null>(null);
  const [result, setResult] = useState<{ ok: boolean; message: string } | null>(null);

  const handleConfirm = async () => {
    if (!pending) return;
    try {
      await onSave(toParams(pending));
      setResult({ ok: true, message: 'Pengaturan disimpan. Rekomendasi dihitung ulang.' });
    } catch (error) {
      if (error instanceof ApiError && error.errors) {
        Object.entries(error.errors).forEach(([field, messages]) => {
          const name = API_FIELD_TO_FORM[field];
          if (name) setError(name, { message: messages.join(' ') });
        });
      }
      setResult({
        ok: false,
        message: error instanceof Error ? error.message : 'Gagal menyimpan pengaturan.',
      });
    } finally {
      setPending(null);
    }
  };

  return (
    <Form methods={methods} onSubmit={handleSubmit((v) => setPending(v))}>
      <Stack spacing={3}>
        <Card>
          <CardHeader
            title="Sinyal Retur (BS)"
            subheader="Kapan rekomendasi diturunkan karena barang banyak kembali."
          />
          <CardContent>
            <Box
              sx={{
                gap: 3,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.NumberInput
                name="returnThresholdPct"
                min={1}
                max={100}
                captionText="Batas retur maksimal (%)"
                helperText="Rasio BS ÷ kiriman kunjungan sebelumnya."
              />
              <Field.NumberInput
                name="returnWindow"
                min={1}
                max={8}
                captionText="Dihitung dari (kunjungan terakhir)"
                helperText={
                  avgInterval
                    ? `≈ ${fNumber(values.returnWindow * avgInterval, 0)} hari dengan interval rata-rata ${fNumber(avgInterval, 1)} hari.`
                    : undefined
                }
              />
              <Field.NumberInput
                name="returnStreak"
                min={1}
                max={8}
                captionText="Minimal kunjungan beruntun di atas batas"
                helperText="1 = cukup rasio gabungan di atas batas."
              />
              <Box sx={{ gap: 2, display: 'flex', alignItems: 'flex-start' }}>
                <Field.Select name="returnCutUnit" label="Satuan" sx={{ width: 120 }}>
                  <MenuItem value="pcs">pcs</MenuItem>
                  <MenuItem value="persen">%</MenuItem>
                </Field.Select>
                <Field.NumberInput
                  name="returnCut"
                  min={1}
                  max={values.returnCutUnit === 'persen' ? 90 : 50}
                  captionText="Besar pengurangan"
                />
              </Box>
            </Box>

            <Alert severity="info" variant="outlined" sx={{ mt: 3 }}>
              {rulePreview(values, avgInterval)}
            </Alert>
          </CardContent>
        </Card>

        <Accordion
          disableGutters
          sx={(theme) => ({
            borderRadius: 2,
            boxShadow: theme.vars.customShadows.card,
            '&::before': { display: 'none' },
          })}
        >
          <AccordionSummary expandIcon={<Iconify icon="eva:arrow-ios-downward-fill" />}>
            <Typography variant="subtitle2">Lanjutan</Typography>
          </AccordionSummary>
          <AccordionDetails>
            <Box
              sx={{
                gap: 3,
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
              }}
            >
              <Field.NumberInput
                name="window"
                min={1}
                max={12}
                captionText="Kunjungan untuk dasar median"
              />
              <Field.NumberInput
                name="minObservations"
                min={1}
                max={12}
                captionText="Minimal observasi riwayat sendiri"
              />
              <Field.NumberInput
                name="stockoutBonus"
                min={0}
                max={20}
                captionText="Tambahan saat sinyal habis (pcs)"
              />
              <Field.NumberInput
                name="maxStepPct"
                min={5}
                max={100}
                captionText="Batas perubahan per kunjungan (%)"
              />
              <Field.NumberInput
                name="minStep"
                min={0}
                max={50}
                captionText="Batas perubahan minimum (pcs)"
              />
            </Box>
          </AccordionDetails>
        </Accordion>

        <Box
          sx={{ gap: 1.5, display: 'flex', flexWrap: 'wrap', alignItems: 'center' }}
        >
          <Typography variant="caption" sx={{ color: 'text.secondary', flexGrow: 1 }}>
            {updatedAt ? `Terakhir disimpan ${fDate(updatedAt)}` : 'Memakai pengaturan default.'}
            {IS_API ? '' : ' · Mode simulasi: tersimpan di browser ini saja.'}
          </Typography>
          <Button
            color="inherit"
            startIcon={<Iconify icon="solar:restart-bold" />}
            onClick={() => reset(toFormValues(defaults))}
          >
            Kembalikan ke default
          </Button>
          <Button color="inherit" variant="outlined" onClick={() => reset(toFormValues(params))}>
            Batal
          </Button>
          <Button type="submit" variant="contained" loading={saving}>
            Simpan
          </Button>
        </Box>
      </Stack>

      <Dialog open={!!pending} onClose={() => setPending(null)} maxWidth="xs" fullWidth>
        <DialogTitle>Simpan pengaturan?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            {IS_API
              ? 'Pengaturan berlaku untuk semua pengguna dashboard dan langsung mengubah rekomendasi stok.'
              : 'Pengaturan disimpan di browser ini saja (mode simulasi).'}
          </Typography>
        </DialogContent>
        <DialogActions>
          <Button color="inherit" onClick={() => setPending(null)}>
            Batal
          </Button>
          <Button variant="contained" onClick={handleConfirm} loading={saving}>
            Simpan
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={!!result}
        autoHideDuration={5000}
        onClose={() => setResult(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={result?.ok ? 'success' : 'error'}
          variant="filled"
          onClose={() => setResult(null)}
        >
          {result?.message}
        </Alert>
      </Snackbar>
    </Form>
  );
}
```

Sebelum menulis, cek: (a) `Form` di `src/components/hook-form/form-provider.tsx` menerima `onSubmit` sebagai handler `form` — sesuaikan bila berbeda; (b) `Field.Select` menerima `children` `MenuItem` (lihat `rhf-select.tsx`); (c) `Button` MUI 9 punya prop `loading` (bila tidak, pakai `disabled={saving}`); (d) `fNumber` menerima argumen kedua digit — lihat `src/utils/format-number.ts`.

- [ ] **Step 5: Gate**

Run: `yarn fix:all && yarn tsc:check && yarn lint && yarn build`
Expected: semua sukses.

- [ ] **Step 6: Cek manual mode simulasi** (`yarn dev`)
  1. Sidebar menampilkan "Pengaturan" → `/dashboard/pengaturan` terbuka, penanda simulasi tampil.
  2. Ubah batas retur 15 → 5, simpan, konfirmasi → toast sukses. Buka Rekomendasi Stok: jumlah "turun" bertambah; label sinyal "Retur tinggi (−1 pcs)"; accordion "Cara rekomendasi dihitung" menyebut 5%.
  3. Isi minimal beruntun 4 dengan jendela 3 → error di field "Minimal kunjungan beruntun", tidak bisa simpan.
  4. Satuan % + 10 → pratinjau "10% dari dasar (min. 1 pcs)".
  5. "Kembalikan ke default" → form kembali 15/3/1/1 pcs; simpan → angka Rekomendasi Stok kembali sama dengan sebelum Task 4.
  6. Tampilan lebar 375px: tidak ada scroll horizontal.

- [ ] **Step 7: Cek manual mode api** — jalankan BE (`cd ../ai-forecast-be && AI_FORECAST_SETTINGS=/tmp/s.json go run ./cmd/api`), FE dengan `NEXT_PUBLIC_FORECAST_SOURCE=api yarn dev`. Ulangi langkah 2 dan 5; pastikan `/tmp/s.json` berubah dan rekomendasi ikut. Matikan BE → halaman pengaturan menampilkan error dari `ForecastDataState`, tidak crash.

- [ ] **Step 8: Commit (repo FE)**

```bash
git add src/routes/paths.ts src/layouts/nav-config-dashboard.tsx src/app/dashboard/pengaturan/ \
  src/sections/forecast/view/settings-view.tsx src/sections/forecast/settings-params-form.tsx \
  docs/superpowers/
git commit -m "feat(forecast): halaman Pengaturan rekomendasi stok"
```

---

### Task 8: Dokumentasi

**Files:**
- Modify: `CLAUDE.md` (FE) — di paragraf "Data has two sources", tambahkan satu kalimat: parameter aturan rekomendasi diatur di `/dashboard/pengaturan` (`useRecommendationParams`; simulasi → localStorage, api → `GET/PUT /api/v1/forecast/settings`), default `DEFAULT_REC_PARAMS` harus sama dengan `DefaultParams` di backend.

- [ ] **Step 1:** Edit `CLAUDE.md` sesuai di atas.
- [ ] **Step 2:** Commit: `git add CLAUDE.md && git commit -m "docs: catat pengaturan rekomendasi"`
