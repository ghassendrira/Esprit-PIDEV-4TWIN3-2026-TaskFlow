import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { finalize } from 'rxjs/operators';
import { ApiService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { TfCardComponent } from '../../shared/ui/card/tf-card.component';
import { TfTableComponent } from '../../shared/ui/table/tf-table.component';
import { TranslatePipe } from '../../shared/pipes/t.pipe';

type AdminDashboardResponse = {
  summary: {
    totalTenants: number;
    totalBusinesses: number;
    activeUsers: number;
    blockedAccounts: number;
    pendingRegistrations: number;
    pendingPasswordResetRequests: number;
  };
  usersByRole: Array<{ role: string; count: number }>;
  businessesPerTenant: Array<{
    tenantId: string;
    tenantName: string;
    businessCount: number;
    userCount: number;
  }>;
  recentActivity: Array<{
    type: string;
    title: string;
    subtitle: string;
    status: string;
    at: string | null;
  }>;
};

type BusinessOwnerDashboardResponse = {
  summary: {
    businessCount: number;
    totalInvoices: number;
    totalInvoicedAmount: number;
    paidAmount: number;
    outstandingAmount: number;
    overdueInvoicesCount: number;
    totalExpenses: number;
    totalClients: number;
    totalEmployees: number;
    currency: string;
  };
  invoicesByStatus: Array<{ label: string; count: number }>;
  expensesByStatus: Array<{ label: string; count: number }>;
  topClients: Array<{
    clientId: string;
    clientName: string;
    invoiceCount: number;
    billedAmount: number;
  }>;
  recentInvoices: Array<{
    id: string;
    invoiceNumber: string;
    clientName: string;
    amount: number;
    status: string;
    issueDate: string | null;
  }>;
  recentExpenses: Array<{
    id: string;
    description: string;
    amount: number;
    status: string;
    date: string | null;
  }>;
};

@Component({
  selector: 'tf-dashboard',
  standalone: true,
  imports: [CommonModule, TfCardComponent, TfTableComponent, TranslatePipe],
  template: `
    <header class="dash-header">
      <div>
        <h1 class="dash-title">{{ 'dashboard.title' | t }}</h1>
        <p class="dash-subtitle">{{ 'dashboard.subtitle' | t }}</p>
      </div>
      <div class="dash-pill" [attr.aria-label]="'dashboard.period' | t">
        <span class="dot"></span>
        <span>{{ dashboardScopeLabel() }}</span>
      </div>
    </header>

    <tf-card *ngIf="loading()" class="table-card">
      <div class="empty-state">Loading dashboard statistics...</div>
    </tf-card>

    <tf-card *ngIf="error()" class="table-card">
      <div class="empty-state">
        <div>{{ error() }}</div>
        <button class="retry-btn" type="button" (click)="reload()">Retry</button>
      </div>
    </tf-card>

    <ng-container *ngIf="!loading() && !error() && isAdmin()">
      <section class="dash-grid metrics">
        <tf-card *ngFor="let card of adminMetricCards()">
          <div class="metric metric-card">
            <div class="k">{{ card.label }}</div>
            <div class="v">{{ card.value }}</div>
            <div class="h">{{ card.hint }}</div>
          </div>
        </tf-card>
      </section>

      <section class="dash-grid analytics-two">
        <tf-card class="analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Users by role</h3>
            <span class="muted">Organization mix</span>
          </div>
          <div class="analytics-layout" *ngIf="adminRoleChartRows().length; else emptyAdminRoles">
            <div class="donut-wrap">
              <div class="donut-chart" [style.background]="adminRoleDonutGradient()">
                <div class="donut-hole">
                  <strong>{{ adminRoleTotal() }}</strong>
                  <span>Total</span>
                </div>
              </div>
            </div>
            <div class="legend-list">
              <div class="legend-row" *ngFor="let row of adminRoleChartRows()">
                <div class="legend-label">
                  <span class="legend-dot" [style.background]="row.color"></span>
                  <div class="legend-copy">
                    <span>{{ row.label }}</span>
                    <small>{{ row.percent | number:'1.0-0' }}%</small>
                  </div>
                </div>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
          </div>
          <ng-template #emptyAdminRoles>
            <div class="empty-state compact">No role distribution available.</div>
          </ng-template>
        </tf-card>

        <tf-card class="analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Operational queues</h3>
            <span class="muted">Pending admin actions</span>
          </div>
          <div class="bar-panel">
            <div class="bar-row" *ngFor="let row of adminQueueChartRows()">
              <div class="bar-meta">
                <div>
                  <strong>{{ row.label }}</strong>
                  <div class="muted">{{ row.percent | number:'1.0-0' }}% of max queue</div>
                </div>
                <span>{{ row.value }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill warn" [style.width.%]="row.percent"></div>
              </div>
            </div>
          </div>
        </tf-card>
      </section>

      <section class="dash-grid analytics-two" style="margin-top: 12px;">
        <tf-card class="analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Tenant portfolio overview</h3>
            <span class="muted">Businesses and users by tenant</span>
          </div>
          <div class="portfolio-card" *ngIf="adminBusinessChartRows().length; else emptyBusinessCoverage">
            <div class="chart-summary-strip">
              <div class="summary-chip">
                <span>Total tenants</span>
                <strong>{{ adminData()?.summary?.totalTenants ?? 0 }}</strong>
              </div>
              <div class="summary-chip">
                <span>Total businesses</span>
                <strong>{{ adminData()?.summary?.totalBusinesses ?? 0 }}</strong>
              </div>
              <div class="summary-chip">
                <span>Active users</span>
                <strong>{{ adminData()?.summary?.activeUsers ?? 0 }}</strong>
              </div>
            </div>

            <div class="portfolio-legend">
              <div class="legend-inline">
                <span class="legend-dot blue"></span>
                <span>Businesses</span>
              </div>
              <div class="legend-inline">
                <span class="legend-dot amber"></span>
                <span>Users</span>
              </div>
            </div>

            <div class="portfolio-simple admin-table-scroll">
              <div class="portfolio-simple-head">
                <span>Tenant</span>
                <span class="right">Businesses</span>
                <span class="right">Users</span>
              </div>

              <div class="portfolio-simple-row" *ngFor="let row of adminPortfolioRows()">
                <div class="tenant-cell">
                  <strong>{{ row.label }}</strong>
                </div>

                <div class="bar-cell">
                  <div class="mini-track">
                    <div class="mini-fill business" [style.width.%]="row.businessPercent"></div>
                  </div>
                  <span class="bar-number">{{ row.businessCount }}</span>
                </div>

                <div class="bar-cell">
                  <div class="mini-track">
                    <div class="mini-fill user" [style.width.%]="row.userPercent"></div>
                  </div>
                  <span class="bar-number">{{ row.userCount }}</span>
                </div>
              </div>
            </div>
          </div>
          <ng-template #emptyBusinessCoverage>
            <div class="empty-state compact">No tenant coverage available.</div>
          </ng-template>
        </tf-card>

        <tf-card class="table-card analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Tenant leaderboard</h3>
            <span class="muted">Live tenant coverage</span>
          </div>
          <div class="leaderboard-table" *ngIf="adminBusinessRows().length; else emptyBusinessTable">
            <div class="leaderboard-head">
              <span>Tenant</span>
              <span>Businesses</span>
              <span>Users</span>
              <span>Coverage</span>
            </div>
            <div class="leaderboard-body admin-table-scroll">
              <div class="leaderboard-row" *ngFor="let row of adminBusinessRows()">
                <div class="tenant-cell">
                  <strong>{{ row.tenantName }}</strong>
                </div>
                <span>{{ row.businessCount }}</span>
                <span>{{ row.userCount }}</span>
                <div class="mini-track">
                  <div class="mini-fill success" [style.width.%]="row.coveragePercent"></div>
                </div>
              </div>
            </div>
          </div>
          <ng-template #emptyBusinessTable>
            <div class="empty-state compact">No tenant coverage available.</div>
          </ng-template>
        </tf-card>
      </section>

      <section class="dash-grid" style="margin-top: 12px;">
        <tf-card class="table-card analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Recent admin activity</h3>
            <span class="muted">Latest platform events</span>
          </div>
          <tf-table [columns]="adminActivityColumns" [data]="adminActivityRows()"></tf-table>
        </tf-card>
      </section>
    </ng-container>

    <ng-container *ngIf="!loading() && !error() && isBusinessOwner()">
      <section class="dash-grid metrics">
        <tf-card *ngFor="let card of ownerMetricCards()">
          <div class="metric metric-card">
            <div class="k">{{ card.label }}</div>
            <div class="v">{{ card.value }}</div>
            <div class="h">{{ card.hint }}</div>
          </div>
        </tf-card>
      </section>

      <section class="dash-grid analytics-main" style="margin-top: 12px;">
        <tf-card class="analytics-card finance-hero">
          <div class="table-head">
            <h3 style="margin: 0;">Financial overview</h3>
            <span class="muted">Cash position and receivables</span>
          </div>
          <div class="finance-summary" *ngIf="ownerCashflowChartRows().length; else emptyCashflow">
            <div class="finance-stats">
              <div class="finance-stat" *ngFor="let row of ownerCashflowChartRows()">
                <span>{{ row.label }}</span>
                <strong>{{ row.value }}</strong>
              </div>
            </div>
            <div class="bar-panel">
              <div class="bar-row" *ngFor="let row of ownerCashflowChartRows()">
                <div class="bar-meta">
                  <div>
                    <strong>{{ row.label }}</strong>
                    <div class="muted">{{ row.percent | number:'1.0-0' }}% of top amount</div>
                  </div>
                  <span>{{ row.value }}</span>
                </div>
                <div class="bar-track large">
                  <div class="bar-fill" [ngClass]="row.tone" [style.width.%]="row.percent"></div>
                </div>
              </div>
            </div>
          </div>
          <ng-template #emptyCashflow>
            <div class="empty-state compact">No financial breakdown available.</div>
          </ng-template>
        </tf-card>

        <div class="dash-grid analytics-stack">
          <tf-card class="analytics-card">
            <div class="table-head">
              <h3 style="margin: 0;">Invoice status</h3>
              <span class="muted">Collection health</span>
            </div>
            <div class="analytics-layout" *ngIf="ownerInvoiceStatusChartRows().length; else emptyInvoiceStatuses">
              <div class="donut-wrap">
                <div class="donut-chart" [style.background]="ownerInvoiceDonutGradient()">
                  <div class="donut-hole">
                    <strong>{{ ownerInvoiceStatusTotal() }}</strong>
                    <span>Invoices</span>
                  </div>
                </div>
              </div>
              <div class="legend-list">
                <div class="legend-row" *ngFor="let row of ownerInvoiceStatusChartRows()">
                  <div class="legend-label">
                    <span class="legend-dot" [style.background]="row.color"></span>
                    <div class="legend-copy">
                      <span>{{ row.label }}</span>
                      <small>{{ row.percent | number:'1.0-0' }}%</small>
                    </div>
                  </div>
                  <strong>{{ row.value }}</strong>
                </div>
              </div>
            </div>
            <ng-template #emptyInvoiceStatuses>
              <div class="empty-state compact">No invoices found yet.</div>
            </ng-template>
          </tf-card>

          <tf-card class="analytics-card">
            <div class="table-head">
              <h3 style="margin: 0;">Expense status</h3>
              <span class="muted">Expense approval mix</span>
            </div>
            <div class="analytics-layout" *ngIf="ownerExpenseStatusChartRows().length; else emptyExpenseStatuses">
              <div class="donut-wrap">
                <div class="donut-chart" [style.background]="ownerExpenseDonutGradient()">
                  <div class="donut-hole">
                    <strong>{{ ownerExpenseStatusTotal() }}</strong>
                    <span>Expenses</span>
                  </div>
                </div>
              </div>
              <div class="legend-list">
                <div class="legend-row" *ngFor="let row of ownerExpenseStatusChartRows()">
                  <div class="legend-label">
                    <span class="legend-dot" [style.background]="row.color"></span>
                    <div class="legend-copy">
                      <span>{{ row.label }}</span>
                      <small>{{ row.percent | number:'1.0-0' }}%</small>
                    </div>
                  </div>
                  <strong>{{ row.value }}</strong>
                </div>
              </div>
            </div>
            <ng-template #emptyExpenseStatuses>
              <div class="empty-state compact">No expenses found yet.</div>
            </ng-template>
          </tf-card>
        </div>
      </section>

      <section class="dash-grid analytics-two" style="margin-top: 12px;">
        <tf-card class="analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Top clients</h3>
            <span class="muted">Revenue concentration</span>
          </div>
          <div class="bar-panel" *ngIf="ownerTopClientChartRows().length; else emptyTopClients">
            <div class="bar-row" *ngFor="let row of ownerTopClientChartRows()">
              <div class="bar-meta">
                <div>
                  <strong>{{ row.label }}</strong>
                  <div class="muted">{{ row.percent | number:'1.0-0' }}% of top client</div>
                </div>
                <span>{{ row.value }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill accent" [style.width.%]="row.percent"></div>
              </div>
            </div>
          </div>
          <ng-template #emptyTopClients>
            <div class="empty-state compact">No client billing data yet.</div>
          </ng-template>
        </tf-card>

        <tf-card class="analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Operations pulse</h3>
            <span class="muted">Core business activity</span>
          </div>
          <div class="bar-panel" *ngIf="ownerOperationsChartRows().length; else emptyOperations">
            <div class="bar-row" *ngFor="let row of ownerOperationsChartRows()">
              <div class="bar-meta">
                <div>
                  <strong>{{ row.label }}</strong>
                  <div class="muted">Current tracked value</div>
                </div>
                <span>{{ row.value }}</span>
              </div>
              <div class="bar-track">
                <div class="bar-fill warn" [style.width.%]="row.percent"></div>
              </div>
            </div>
          </div>
          <ng-template #emptyOperations>
            <div class="empty-state compact">No operations breakdown available.</div>
          </ng-template>
        </tf-card>
      </section>

      <section class="dash-grid analytics-two" style="margin-top: 12px;">
        <tf-card class="table-card analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Recent invoices</h3>
            <span class="muted">Latest billing activity</span>
          </div>
          <tf-table [columns]="ownerInvoiceColumns" [data]="ownerInvoiceRows()"></tf-table>
        </tf-card>

        <tf-card class="table-card analytics-card">
          <div class="table-head">
            <h3 style="margin: 0;">Recent expenses</h3>
            <span class="muted">Latest spending activity</span>
          </div>
          <tf-table [columns]="ownerExpenseColumns" [data]="ownerExpenseRows()"></tf-table>
        </tf-card>
      </section>
    </ng-container>

    <tf-card *ngIf="!loading() && !error() && !isAdmin() && !isBusinessOwner()" class="table-card">
      <div class="empty-state">Dashboard statistics are available for Admin and Business Owner roles.</div>
    </tf-card>
  `,
  styles: [`
    :host { display: block; }

    .dash-header { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; margin-bottom: 14px; }
    .dash-title { margin: 0; font-size: 22px; line-height: 1.2; letter-spacing: -0.02em; }
    .dash-subtitle { margin: 6px 0 0; color: var(--tf-muted); font-size: 13px; }

    .dash-pill { display: inline-flex; align-items: center; gap: 10px; height: 34px; padding: 0 12px; border-radius: 999px; border: 1px solid var(--tf-border); background: var(--tf-card); color: var(--tf-muted); font-size: 12px; }
    .dot { width: 8px; height: 8px; border-radius: 999px; background: var(--tf-primary); opacity: .9; }

    .dash-grid { display: grid; gap: 12px; }
    .dash-grid.metrics { grid-template-columns: repeat(3, minmax(0, 1fr)); }
    .dash-grid.analytics-two { grid-template-columns: repeat(2, minmax(0, 1fr)); }
    .dash-grid.analytics-main { grid-template-columns: 1.3fr .9fr; }
    .dash-grid.analytics-stack { display: grid; gap: 12px; }

    .metric { display: grid; gap: 6px; }
    .metric-card { min-height: 116px; }
    .metric .k { color: var(--tf-muted); font-size: 12px; font-weight: 600; letter-spacing: .02em; }
    .metric .v { font-size: 26px; font-weight: 750; letter-spacing: -0.02em; }
    .metric .h { color: var(--tf-muted); font-size: 12px; }

    .analytics-card { min-height: 100%; }
    .analytics-layout { display: grid; grid-template-columns: 140px 1fr; gap: 18px; align-items: center; }
    .donut-wrap { display: grid; place-items: center; }
    .donut-chart {
      width: 124px;
      height: 124px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      border: 1px solid var(--tf-border);
      box-shadow: inset 0 0 0 1px rgba(255,255,255,0.05);
    }
    .donut-hole {
      width: 68px;
      height: 68px;
      border-radius: 50%;
      display: grid;
      place-items: center;
      gap: 2px;
      background: var(--tf-card);
      border: 1px solid var(--tf-border);
      text-align: center;
    }
    .donut-hole strong { font-size: 18px; line-height: 1; }
    .donut-hole span { font-size: 11px; color: var(--tf-muted); }
    .legend-list { display: grid; gap: 10px; }
    .legend-row { display: flex; align-items: center; justify-content: space-between; gap: 12px; padding: 10px 12px; border: 1px solid var(--tf-border); border-radius: 12px; background: var(--tf-surface-2); }
    .legend-label { display: flex; align-items: center; gap: 10px; min-width: 0; color: var(--tf-muted); }
    .legend-copy { display: grid; gap: 2px; }
    .legend-copy span { color: var(--tf-on-surface); font-size: 13px; }
    .legend-copy small { color: var(--tf-muted); font-size: 11px; }
    .legend-dot { width: 10px; height: 10px; border-radius: 50%; flex: 0 0 auto; }
    .bar-panel { display: grid; gap: 14px; }
    .bar-row { display: grid; gap: 8px; }
    .bar-meta { display: flex; align-items: flex-end; justify-content: space-between; gap: 12px; }
    .bar-meta strong { display: block; font-size: 13px; }
    .bar-meta span { font-size: 13px; font-weight: 700; }
    .bar-track { width: 100%; height: 10px; border-radius: 999px; background: var(--tf-surface-2); border: 1px solid var(--tf-border); overflow: hidden; }
    .bar-track.large { height: 12px; }
    .bar-fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg, #3b82f6, #6366f1); }
    .bar-fill.success { background: linear-gradient(90deg, #10b981, #22c55e); }
    .bar-fill.warn { background: linear-gradient(90deg, #f59e0b, #f97316); }
    .bar-fill.accent { background: linear-gradient(90deg, #8b5cf6, #ec4899); }
    .finance-hero { background: linear-gradient(180deg, rgba(99,102,241,.08), rgba(59,130,246,.02)); }
    .finance-summary { display: grid; gap: 18px; }
    .finance-stats { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 12px; }
    .finance-stat { padding: 14px; border-radius: 14px; border: 1px solid var(--tf-border); background: rgba(255,255,255,0.02); display: grid; gap: 6px; }
    .finance-stat span { color: var(--tf-muted); font-size: 12px; }
    .finance-stat strong { font-size: 18px; line-height: 1.2; }
    .admin-table-scroll {
      max-height: 380px;
      overflow: auto;
      border-radius: 12px;
    }
    .portfolio-card { display: grid; gap: 14px; }
    .chart-summary-strip { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px; }
    .summary-chip {
      padding: 12px 14px;
      border-radius: 12px;
      border: 1px solid var(--tf-border);
      background: var(--tf-surface-2);
      display: grid;
      gap: 4px;
    }
    .summary-chip span { font-size: 12px; color: var(--tf-muted); }
    .summary-chip strong { font-size: 18px; line-height: 1.2; }
    .portfolio-legend { display: flex; align-items: center; gap: 14px; }
    .legend-inline { display: inline-flex; align-items: center; gap: 8px; font-size: 12px; color: var(--tf-muted); }
    .legend-dot.blue { background: #3b82f6; }
    .legend-dot.amber { background: #f59e0b; }
    .portfolio-simple { border: 1px solid var(--tf-border); border-radius: 14px; overflow: hidden; background: var(--tf-card); }
    .portfolio-simple-head,
    .portfolio-simple-row {
      display: grid;
      grid-template-columns: minmax(0, 1.6fr) 1fr 1fr;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
    }
    .portfolio-simple-head {
      background: var(--tf-surface-2);
      color: var(--tf-muted);
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--tf-border);
    }
    .portfolio-simple-head .right { text-align: right; }
    .portfolio-simple-row { border-bottom: 1px solid rgba(148, 163, 184, 0.16); font-size: 13px; }
    .portfolio-simple-row:last-child { border-bottom: 0; }
    .bar-cell { display: grid; grid-template-columns: 1fr 34px; gap: 10px; align-items: center; }
    .bar-number { text-align: right; font-weight: 700; font-size: 12px; color: var(--tf-on-surface); }
    .mini-fill.business { background: linear-gradient(90deg, #3b82f6, #6366f1); }
    .mini-fill.user { background: linear-gradient(90deg, #f59e0b, #f97316); }
    .leaderboard-table {
      border: 1px solid var(--tf-border);
      border-radius: 14px;
      overflow: hidden;
      background: var(--tf-card);
    }
    .leaderboard-head,
    .leaderboard-row {
      display: grid;
      grid-template-columns: minmax(0, 1.8fr) 80px 60px 110px;
      gap: 12px;
      align-items: center;
      padding: 10px 12px;
    }
    .leaderboard-head {
      background: var(--tf-surface-2);
      color: var(--tf-muted);
      font-size: 12px;
      font-weight: 600;
      border-bottom: 1px solid var(--tf-border);
    }
    .leaderboard-body { display: grid; }
    .leaderboard-row {
      font-size: 13px;
      border-bottom: 1px solid rgba(148, 163, 184, 0.16);
    }
    .leaderboard-row:last-child { border-bottom: 0; }
    .tenant-cell {
      min-width: 0;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .mini-track {
      height: 8px;
      border-radius: 999px;
      border: 1px solid var(--tf-border);
      background: var(--tf-surface-2);
      overflow: hidden;
    }
    .mini-fill { height: 100%; border-radius: inherit; }
    .mini-fill.success { background: linear-gradient(90deg, #10b981, #22c55e); }

    .table-card { margin-top: 12px; }
    .table-head { display: flex; align-items: baseline; justify-content: space-between; gap: 12px; margin-bottom: 10px; }
    .empty-state { display: grid; gap: 12px; place-items: center; min-height: 120px; text-align: center; color: var(--tf-muted); }
    .empty-state.compact { min-height: 80px; }
    .retry-btn { border: 1px solid var(--tf-border); background: var(--tf-card); color: var(--tf-on-surface); border-radius: 10px; padding: 8px 14px; cursor: pointer; }

    @media (max-width: 900px) {
      .dash-header { align-items: flex-start; flex-direction: column; }
      .dash-grid.metrics { grid-template-columns: 1fr; }
      .dash-grid.analytics-two { grid-template-columns: 1fr; }
      .dash-grid.analytics-main { grid-template-columns: 1fr; }
      .analytics-layout { grid-template-columns: 1fr; }
      .finance-stats { grid-template-columns: 1fr; }
      .chart-summary-strip { grid-template-columns: 1fr; }
      .leaderboard-head,
      .leaderboard-row { grid-template-columns: minmax(0, 1.5fr) 70px 50px 90px; }
    }
  `]
})
export class DashboardComponent implements OnInit {
  private api = inject(ApiService);
  private auth = inject(AuthService);

  readonly loading = signal(true);
  readonly error = signal('');
  readonly adminData = signal<AdminDashboardResponse | null>(null);
  readonly ownerData = signal<BusinessOwnerDashboardResponse | null>(null);

  readonly isAdmin = computed(() => {
    const roles = this.auth.roles() as string[];
    return roles.includes('SUPER_ADMIN') || roles.includes('ADMIN');
  });

  readonly isBusinessOwner = computed(() => {
    const roles = this.auth.roles() as string[];
    return roles.includes('BUSINESS_OWNER') || roles.includes('OWNER');
  });

  readonly dashboardScopeLabel = computed(() => {
    if (this.isAdmin()) return 'Platform overview';
    if (this.isBusinessOwner()) return 'Business overview';
    return 'Dashboard';
  });

  readonly adminMetricCards = computed(() => {
    const summary = this.adminData()?.summary;
    if (!summary) return [];
    return [
      {
        label: 'Total tenants',
        value: String(summary.totalTenants),
        hint: `${summary.totalBusinesses} businesses across the platform`,
      },
      {
        label: 'Active users',
        value: String(summary.activeUsers),
        hint: `${summary.blockedAccounts} accounts currently blocked`,
      },
      {
        label: 'Pending actions',
        value: String(summary.pendingRegistrations + summary.pendingPasswordResetRequests),
        hint: `${summary.pendingRegistrations} registrations and ${summary.pendingPasswordResetRequests} reset requests`,
      },
    ];
  });

  readonly ownerMetricCards = computed(() => {
    const summary = this.ownerData()?.summary;
    if (!summary) return [];
    return [
      {
        label: 'Invoiced amount',
        value: this.formatMoney(summary.totalInvoicedAmount, summary.currency),
        hint: `${summary.totalInvoices} invoices across ${summary.businessCount} businesses`,
      },
      {
        label: 'Outstanding amount',
        value: this.formatMoney(summary.outstandingAmount, summary.currency),
        hint: `${summary.overdueInvoicesCount} overdue invoices`,
      },
      {
        label: 'Expenses',
        value: this.formatMoney(summary.totalExpenses, summary.currency),
        hint: `${summary.totalClients} clients and ${summary.totalEmployees} employees`,
      },
    ];
  });

  readonly adminUsersByRoleRows = computed(() =>
    (this.adminData()?.usersByRole ?? []).map((row) => ({
      label: this.toTitleCase(row.role.replace(/_/g, ' ')),
      value: String(row.count),
    })),
  );

  readonly adminRoleChartRows = computed(() =>
    this.withPercentages(
      (this.adminData()?.usersByRole ?? []).map((row) => ({
        label: this.toTitleCase(row.role.replace(/_/g, ' ')),
        amount: row.count,
        value: String(row.count),
        color: this.paletteFromIndex(0),
      })),
    ).map((row, index) => ({ ...row, color: this.paletteFromIndex(index) })),
  );

  readonly adminQueueChartRows = computed(() => {
    const summary = this.adminData()?.summary;
    if (!summary) return [];
    return this.withPercentages([
      { label: 'Pending registrations', amount: summary.pendingRegistrations, value: String(summary.pendingRegistrations) },
      { label: 'Blocked accounts', amount: summary.blockedAccounts, value: String(summary.blockedAccounts) },
      { label: 'Password reset requests', amount: summary.pendingPasswordResetRequests, value: String(summary.pendingPasswordResetRequests) },
    ]);
  });

  readonly adminBusinessChartRows = computed(() =>
    (this.adminData()?.businessesPerTenant ?? []).map((row) => ({
      tenantName: row.tenantName,
      businessCount: row.businessCount,
      userCount: row.userCount,
    })),
  );

  readonly adminPortfolioRows = computed(() => {
    const rows = [...this.adminBusinessChartRows()]
      .sort(
        (a, b) =>
          b.businessCount - a.businessCount ||
          b.userCount - a.userCount ||
          a.tenantName.localeCompare(b.tenantName),
      )
      .slice(0, 12);

    const maxValue = Math.max(
      1,
      ...rows.map((r) => Math.max(Number(r.businessCount ?? 0), Number(r.userCount ?? 0))),
    );

    return rows.map((r) => ({
      label: r.tenantName,
      shortLabel: this.shortenLabel(r.tenantName, 8),
      businessCount: r.businessCount,
      userCount: r.userCount,
      businessPercent: (Number(r.businessCount ?? 0) / maxValue) * 100,
      userPercent: (Number(r.userCount ?? 0) / maxValue) * 100,
    }));
  });

  readonly ownerInvoiceStatusRows = computed(() =>
    (this.ownerData()?.invoicesByStatus ?? []).map((row) => ({
      label: this.toTitleCase(row.label.replace(/_/g, ' ')),
      value: String(row.count),
    })),
  );

  readonly ownerExpenseStatusRows = computed(() =>
    (this.ownerData()?.expensesByStatus ?? []).map((row) => ({
      label: this.toTitleCase(row.label.replace(/_/g, ' ')),
      value: String(row.count),
    })),
  );

  readonly ownerTopClientRows = computed(() => {
    const currency = this.ownerData()?.summary?.currency ?? 'TND';
    return (this.ownerData()?.topClients ?? []).map((row) => ({
      label: row.clientName,
      value: this.formatMoney(row.billedAmount, currency),
    }));
  });

  readonly ownerInvoiceStatusChartRows = computed(() =>
    this.withPercentages(
      (this.ownerData()?.invoicesByStatus ?? []).map((row) => ({
        label: this.toTitleCase(row.label.replace(/_/g, ' ')),
        amount: row.count,
        value: String(row.count),
        color: this.paletteFromIndex(0),
      })),
    ).map((row, index) => ({ ...row, color: this.paletteFromIndex(index) })),
  );

  readonly ownerExpenseStatusChartRows = computed(() =>
    this.withPercentages(
      (this.ownerData()?.expensesByStatus ?? []).map((row) => ({
        label: this.toTitleCase(row.label.replace(/_/g, ' ')),
        amount: row.count,
        value: String(row.count),
        color: this.paletteFromIndex(0),
      })),
    ).map((row, index) => ({ ...row, color: this.paletteFromIndex(index + 3) })),
  );

  readonly ownerTopClientChartRows = computed(() => {
    const currency = this.ownerData()?.summary?.currency ?? 'TND';
    return this.withPercentages(
      (this.ownerData()?.topClients ?? []).map((row) => ({
        label: row.clientName,
        amount: row.billedAmount,
        value: this.formatMoney(row.billedAmount, currency),
      })),
    );
  });

  readonly ownerCashflowChartRows = computed(() => {
    const summary = this.ownerData()?.summary;
    if (!summary) return [];
    return this.withPercentages([
      { label: 'Total invoiced', amount: summary.totalInvoicedAmount, value: this.formatMoney(summary.totalInvoicedAmount, summary.currency), tone: 'primary' },
      { label: 'Paid', amount: summary.paidAmount, value: this.formatMoney(summary.paidAmount, summary.currency), tone: 'success' },
      { label: 'Outstanding', amount: summary.outstandingAmount, value: this.formatMoney(summary.outstandingAmount, summary.currency), tone: 'warn' },
    ]);
  });

  readonly ownerOperationsChartRows = computed(() => {
    const summary = this.ownerData()?.summary;
    if (!summary) return [];
    return this.withPercentages([
      { label: 'Clients', amount: summary.totalClients, value: String(summary.totalClients) },
      { label: 'Employees', amount: summary.totalEmployees, value: String(summary.totalEmployees) },
      { label: 'Overdue invoices', amount: summary.overdueInvoicesCount, value: String(summary.overdueInvoicesCount) },
    ]);
  });

  readonly adminRoleDonutGradient = computed(() => this.buildDonutGradient(this.adminRoleChartRows()));
  readonly ownerInvoiceDonutGradient = computed(() => this.buildDonutGradient(this.ownerInvoiceStatusChartRows()));
  readonly ownerExpenseDonutGradient = computed(() => this.buildDonutGradient(this.ownerExpenseStatusChartRows()));
  readonly adminRoleTotal = computed(() => this.sumAmounts(this.adminRoleChartRows()));
  readonly ownerInvoiceStatusTotal = computed(() => this.sumAmounts(this.ownerInvoiceStatusChartRows()));
  readonly ownerExpenseStatusTotal = computed(() => this.sumAmounts(this.ownerExpenseStatusChartRows()));

  readonly adminBusinessColumns = [
    { key: 'tenantName', label: 'Tenant' },
    { key: 'businessCount', label: 'Businesses' },
    { key: 'userCount', label: 'Users' },
  ];

  readonly adminActivityColumns = [
    { key: 'title', label: 'Activity' },
    { key: 'status', label: 'Status' },
    { key: 'at', label: 'Date' },
  ];

  readonly ownerInvoiceColumns = [
    { key: 'clientName', label: 'Client' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'issueDate', label: 'Issued at' },
  ];

  readonly ownerExpenseColumns = [
    { key: 'description', label: 'Expense' },
    { key: 'amount', label: 'Amount' },
    { key: 'status', label: 'Status' },
    { key: 'date', label: 'Date' },
  ];

  readonly adminBusinessRows = computed(() =>
    this.withPercentages(
      (this.adminData()?.businessesPerTenant ?? []).map((row) => ({
        tenantName: row.tenantName,
        amount: row.businessCount,
        businessCount: row.businessCount,
        userCount: row.userCount,
      })),
    )
      .sort((a, b) => b.businessCount - a.businessCount || b.userCount - a.userCount)
      .map((row) => ({
        tenantName: row.tenantName,
        businessCount: row.businessCount,
        userCount: row.userCount,
        coveragePercent: row.percent,
      })),
  );

  readonly adminActivityRows = computed(() =>
    (this.adminData()?.recentActivity ?? []).map((row) => ({
      title: row.title,
      status: this.toTitleCase(String(row.status ?? '').replace(/_/g, ' ')),
      at: this.formatDate(row.at),
    })),
  );

  readonly ownerInvoiceRows = computed(() => {
    const currency = this.ownerData()?.summary?.currency ?? 'TND';
    return (this.ownerData()?.recentInvoices ?? []).map((row) => ({
      clientName: row.clientName,
      amount: this.formatMoney(row.amount, currency),
      status: this.toTitleCase(row.status.replace(/_/g, ' ')),
      issueDate: this.formatDate(row.issueDate),
    }));
  });

  readonly ownerExpenseRows = computed(() => {
    const currency = this.ownerData()?.summary?.currency ?? 'TND';
    return (this.ownerData()?.recentExpenses ?? []).map((row) => ({
      description: row.description,
      amount: this.formatMoney(row.amount, currency),
      status: this.toTitleCase(row.status.replace(/_/g, ' ')),
      date: this.formatDate(row.date),
    }));
  });

  ngOnInit(): void {
    this.reload();
  }

  reload(): void {
    this.loading.set(true);
    this.error.set('');
    this.adminData.set(null);
    this.ownerData.set(null);

    if (this.isAdmin()) {
      this.api
        .get<AdminDashboardResponse>('/dashboard/admin')
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response: AdminDashboardResponse) => {
            this.adminData.set(response);
          },
          error: (error: any) => {
            this.error.set(error?.error?.message || error?.message || 'Failed to load dashboard statistics.');
          },
        });
      return;
    }

    if (this.isBusinessOwner()) {
      this.api
        .get<BusinessOwnerDashboardResponse>('/dashboard/business-owner')
        .pipe(finalize(() => this.loading.set(false)))
        .subscribe({
          next: (response: BusinessOwnerDashboardResponse) => {
            this.ownerData.set(response);
          },
          error: (error: any) => {
            this.error.set(error?.error?.message || error?.message || 'Failed to load dashboard statistics.');
          },
        });
      return;
    }

    if (!this.isAdmin() && !this.isBusinessOwner()) {
      this.loading.set(false);
    }
  }

  private formatMoney(amount: number, currency: string): string {
    return `${new Intl.NumberFormat('en-US', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2,
    }).format(Number(amount ?? 0))} ${currency || 'TND'}`;
  }

  private formatDate(value: string | null | undefined): string {
    if (!value) return '-';
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return '-';
    return new Intl.DateTimeFormat('en-GB', {
      year: 'numeric',
      month: 'short',
      day: '2-digit',
    }).format(date);
  }

  private toTitleCase(value: string): string {
    return value
      .toLowerCase()
      .split(' ')
      .filter(Boolean)
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  private withPercentages<T extends { amount: number }>(rows: T[]): Array<T & { percent: number }> {
    const max = rows.reduce((currentMax, row) => Math.max(currentMax, Number(row.amount ?? 0)), 0);
    return rows.map((row) => ({
      ...row,
      percent: max > 0 ? Math.max(6, (Number(row.amount ?? 0) / max) * 100) : 0,
    }));
  }

  private buildDonutGradient(rows: Array<{ amount: number; color: string }>): string {
    const total = this.sumAmounts(rows);
    if (!rows.length || total <= 0) {
      return 'conic-gradient(#e5e7eb 0deg 360deg)';
    }

    let current = 0;
    const parts = rows.map((row) => {
      const slice = (row.amount / total) * 360;
      const start = current;
      const end = current + slice;
      current = end;
      return `${row.color} ${start}deg ${end}deg`;
    });
    return `conic-gradient(${parts.join(', ')})`;
  }

  private sumAmounts(rows: Array<{ amount: number }>): number {
    return rows.reduce((sum, row) => sum + Number(row.amount ?? 0), 0);
  }

  private paletteFromIndex(index: number): string {
    const palette = ['#3b82f6', '#8b5cf6', '#10b981', '#f59e0b', '#ec4899', '#14b8a6', '#f97316'];
    return palette[index % palette.length];
  }

  private shortenLabel(value: string, max = 10): string {
    const clean = String(value ?? '').trim();
    return clean.length > max ? `${clean.slice(0, max)}...` : clean;
  }

  // NOTE: Admin portfolio chart uses grouped bars now (businesses vs users).
}

