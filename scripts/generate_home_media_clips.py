"""Render six role/module slideshow clips for the home-page media widget.

The slides mirror the existing website, VOR/DME PMDT shells, ADS-B scenario
wizard, QCMS monitor, and maintenance terminal.

Run from the repository root:

    $env:PYTHONPATH = "C:\\tmp\\adsb-video-tools"
    python scripts/generate_home_media_clips.py
"""

from __future__ import annotations

import subprocess
import sys
from functools import lru_cache
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont


WIDTH = 1280
HEIGHT = 720
FPS = 24
SLIDE_SECONDS = 4.3
SLIDE_COUNT = 7
TRANSITION_SECONDS = 0.5
DURATION = SLIDE_SECONDS * SLIDE_COUNT

ROOT = Path(__file__).resolve().parents[1]
OUTPUT_DIR = ROOT / "public" / "media"
FONT_REGULAR = Path(r"C:\Windows\Fonts\segoeui.ttf")
FONT_BOLD = Path(r"C:\Windows\Fonts\segoeuib.ttf")

# Colors are copied from the PMDT Tailwind classes in src/components/vor.
BG = "#070A12"
WORKSPACE = "#0A0E1A"
SIDEBAR = "#0F172A"
PANEL = "#111827"
PANEL_ALT = "#1E293B"
TABLE_HEAD = "#172033"
LINE = "#334155"
LINE_SOFT = "#273449"
TEXT = "#E2E8F0"
MUTED = "#94A3B8"
MUTED_DARK = "#64748B"
BLUE = "#2563EB"
BLUE_DARK = "#1E40AF"
BLUE_LIGHT = "#60A5FA"
GREEN = "#22C55E"
GREEN_BG = "#0F3A1F"
GREEN_TEXT = "#BBF7D0"
YELLOW = "#EAB308"
YELLOW_BG = "#3A2F0F"
YELLOW_TEXT = "#FEF08A"
RED = "#EF4444"
RED_BG = "#3A0F0F"
RED_TEXT = "#FECACA"

TITLE_H = 32
MENU_H = 36
STATUS_H = 28
BODY_TOP = TITLE_H + MENU_H
BODY_BOTTOM = HEIGHT - STATUS_H
LEFT_W = 176
RIGHT_X = 960


def font(size: int, bold: bool = False) -> ImageFont.FreeTypeFont:
    return ImageFont.truetype(str(FONT_BOLD if bold else FONT_REGULAR), size)


def label(
    draw: ImageDraw.ImageDraw,
    xy: tuple[float, float],
    value: str,
    size: int,
    color: str = TEXT,
    bold: bool = False,
    anchor: str | None = None,
) -> None:
    draw.text(xy, value, font=font(size, bold), fill=color, anchor=anchor)


def box(
    draw: ImageDraw.ImageDraw,
    bounds: tuple[float, float, float, float],
    fill: str,
    outline: str | None = None,
    width: int = 1,
    radius: int = 0,
) -> None:
    if radius:
        draw.rounded_rectangle(bounds, radius=radius, fill=fill, outline=outline, width=width)
    else:
        draw.rectangle(bounds, fill=fill, outline=outline, width=width)


def fit_text(draw: ImageDraw.ImageDraw, value: str, max_width: int, size: int, bold: bool = False) -> str:
    result = value
    active_font = font(size, bold)
    while result and draw.textlength(result, font=active_font) > max_width:
        result = result[:-1]
    return result if result == value else result.rstrip() + "…"


def wrapped(
    draw: ImageDraw.ImageDraw,
    xy: tuple[int, int],
    value: str,
    max_width: int,
    size: int,
    color: str = TEXT,
    bold: bool = False,
    line_gap: int = 5,
    max_lines: int = 3,
) -> None:
    words = value.split()
    lines: list[str] = []
    current = ""
    active_font = font(size, bold)
    for word in words:
        candidate = f"{current} {word}".strip()
        if draw.textlength(candidate, font=active_font) <= max_width:
            current = candidate
        else:
            if current:
                lines.append(current)
            current = word
    if current:
        lines.append(current)
    if len(lines) > max_lines:
        lines = lines[:max_lines]
        lines[-1] = fit_text(draw, lines[-1] + "…", max_width, size, bold)
    x, y = xy
    for index, line in enumerate(lines):
        label(draw, (x, y + index * (size + line_gap)), line, size, color, bold)


def indicator(draw: ImageDraw.ImageDraw, x: int, y: int, color: str) -> None:
    draw.ellipse((x - 6, y - 6, x + 6, y + 6), fill=color, outline="#020617", width=1)


def title_bar(draw: ImageDraw.ImageDraw, author: bool, equipment: str = "DVOR") -> None:
    start = (30, 58, 95)
    end = (15, 40, 71)
    for x in range(WIDTH):
        ratio = x / (WIDTH - 1)
        color = tuple(round(start[i] + (end[i] - start[i]) * ratio) for i in range(3))
        draw.line((x, 0, x, TITLE_H), fill=color)
    draw.line((0, TITLE_H - 1, WIDTH, TITLE_H - 1), fill="#29496A")
    box(draw, (8, 6, 28, 26), "#E5EDF5", "#7392B1")
    label(draw, (18, 16), "A", 11, BLUE_DARK, True, "mm")
    label(draw, (38, 16), f"- Dual {equipment} - SELEX Systems Integration Inc. PMDT", 12, "#F8FAFC", True, "lm")
    if author:
        box(draw, (698, 4, 782, 28), "#0F172A", "#475569")
        label(draw, (740, 16), "AUTHORING", 9, "#CBD5E1", True, "mm")
    for index, symbol in enumerate(("−", "□", "×")):
        x1 = WIDTH - 108 + index * 36
        draw.line((x1, 0, x1, TITLE_H), fill="#FFFFFF1A")
        label(draw, (x1 + 18, 15), symbol, 15, "#DBEAFE", False, "mm")


def menu_bar(draw: ImageDraw.ImageDraw, active: str | None = None, open_menu: bool = False) -> None:
    y1, y2 = TITLE_H, BODY_TOP
    box(draw, (0, y1, WIDTH, y2), PANEL_ALT)
    draw.line((0, y2 - 1, WIDTH, y2 - 1), fill=LINE)
    menus = ["System", "RMS", "Monitors", "Monitor 1", "Monitor 2", "Transmitters", "Diagnostics", "Info"]
    x = 8
    positions: dict[str, tuple[int, int]] = {}
    for menu in menus:
        width = int(ImageDraw.Draw(Image.new("RGB", (1, 1))).textlength(menu, font=font(12, True))) + 32
        positions[menu] = (x, x + width)
        if menu == active:
            box(draw, (x, y1, x + width, y2), BLUE_DARK)
        label(draw, (x + 12, (y1 + y2) / 2), menu, 12, TEXT, True, "lm")
        caret_x = x + width - 11
        caret_y = int((y1 + y2) / 2)
        draw.polygon(((caret_x - 3, caret_y - 2), (caret_x + 3, caret_y - 2), (caret_x, caret_y + 2)), fill=MUTED)
        x += width
    if open_menu and "Transmitters" in positions:
        x1, x2 = positions["Transmitters"]
        y = BODY_TOP
        box(draw, (x1, y, x1 + 218, y + 100), SIDEBAR, "#475569", 1)
        items = ("Data", "Configuration", "Commands  ›")
        for index, item in enumerate(items):
            row_y = y + 2 + index * 32
            if index == 0:
                box(draw, (x1 + 1, row_y, x1 + 217, row_y + 31), BLUE_DARK)
            label(draw, (x1 + 13, row_y + 16), item, 12, TEXT, False, "lm")


def sidebar_section(draw: ImageDraw.ImageDraw, y1: int, y2: int, title: str) -> None:
    box(draw, (8, y1, LEFT_W - 8, y2), PANEL, LINE)
    label(draw, (18, y1 + 11), title, 11, TEXT, True)


def pmdt_sidebar(draw: ImageDraw.ImageDraw, fault: bool = False, module: str = "vor") -> None:
    box(draw, (0, BODY_TOP, LEFT_W, BODY_BOTTOM), SIDEBAR)
    draw.line((LEFT_W - 1, BODY_TOP, LEFT_W - 1, BODY_BOTTOM), fill=LINE)

    sidebar_section(draw, 76, 150, "Connection")
    box(draw, (90, 86, 159, 111), GREEN_BG, "#166534")
    indicator(draw, 102, 98, GREEN)
    label(draw, (113, 98), "Connected", 9, GREEN_TEXT, True, "lm")
    indicator(draw, 24, 132, YELLOW if fault else MUTED_DARK)
    label(draw, (35, 132), "Alert", 10, MUTED, False, "lm")
    indicator(draw, 92, 132, YELLOW)
    label(draw, (103, 132), "Local", 10, TEXT, False, "lm")

    sidebar_section(draw, 158, 272, "Transmitters")
    label(draw, (116, 178), "Tx1", 9, TEXT, True, "mm")
    label(draw, (148, 178), "Tx2", 9, TEXT, True, "mm")
    for index, row in enumerate(("Main", "Antenna", "Load", "Off")):
        y = 198 + index * 17
        label(draw, (18, y), row, 9, MUTED, False, "lm")
        indicator(draw, 116, y, RED if fault and row == "Main" else (GREEN if row in ("Main", "Antenna") else MUTED_DARK))
        indicator(draw, 148, y, GREEN if row in ("Main", "Antenna") else MUTED_DARK)

    sidebar_section(draw, 280, 400, "Monitors Integral")
    for index, (row, color) in enumerate((("Normal", GREEN), ("Pri Alarm", RED if fault else MUTED_DARK),
                                          ("Sec Alarm", MUTED_DARK), ("Bypass", YELLOW))):
        y = 314 + index * 21
        label(draw, (18, y), row, 9, MUTED, False, "lm")
        indicator(draw, 148, y, color)

    sidebar_section(draw, 408, 584, "Monitor 1" if module == "dme" else "Monitor 1 - Antenna 1")
    values = (
        (("Delay", "0.21", "normal"), ("Spacing", "12.0", "normal"),
         ("Tx Power", "38.4", "alarm" if fault else "normal"), ("ERP", "31.8", "normal"),
         ("Efficiency", "82.7", "normal"), ("PRF", "1200", "normal"))
        if module == "dme"
        else (("Azimuth", "+0.82", "normal"), ("30 Hz", "29.8", "normal"),
              ("9960 Hz", "31.2", "normal"), ("Dev", "+2.80", "alarm" if fault else "normal"),
              ("RF", "-92.0", "normal"))
    )
    for index, (name, value, state) in enumerate(values):
        y1 = 436 + index * 25
        fill, outline, color = (RED_BG, "#7F1D1D", RED_TEXT) if state == "alarm" else (GREEN_BG, "#1D6837", GREEN_TEXT)
        box(draw, (16, y1, 160, y1 + 20), fill, outline)
        label(draw, (23, y1 + 10), name, 9, color, False, "lm")
        label(draw, (152, y1 + 10), value, 9, color, True, "rm")


def table_panel(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int], title: str,
                columns: tuple[str, ...], rows: tuple[tuple[str, ...], ...], fault_cell: tuple[int, int] | None = None) -> tuple[int, int, int, int] | None:
    x1, y1, x2, y2 = bounds
    box(draw, bounds, PANEL, LINE)
    box(draw, (x1, y1, x2, y1 + 32), PANEL_ALT)
    draw.line((x1, y1 + 32, x2, y1 + 32), fill=LINE)
    label(draw, (x1 + 12, y1 + 16), title, 11, TEXT, True, "lm")
    header_y = y1 + 32
    box(draw, (x1, header_y, x2, header_y + 28), TABLE_HEAD)
    col_width = (x2 - x1) / len(columns)
    for col, column in enumerate(columns):
        anchor = "rm" if col > 0 else "lm"
        px = x1 + col_width * (col + 1) - 10 if col > 0 else x1 + 10
        label(draw, (px, header_y + 14), column, 9, MUTED, True, anchor)
    highlighted: tuple[int, int, int, int] | None = None
    row_height = min(29, max(22, int((y2 - header_y - 28) / max(1, len(rows)))))
    for row_index, row in enumerate(rows):
        top = header_y + 28 + row_index * row_height
        draw.line((x1, top, x2, top), fill=LINE_SOFT)
        for col, value in enumerate(row):
            cell_x1 = int(x1 + col_width * col)
            cell_x2 = int(x1 + col_width * (col + 1))
            is_fault = fault_cell == (row_index, col)
            if col > 0:
                box(draw, (cell_x1, top + 1, cell_x2, top + row_height - 1), RED_BG if is_fault else GREEN_BG)
            anchor = "rm" if col > 0 else "lm"
            px = cell_x2 - 10 if col > 0 else cell_x1 + 10
            label(draw, (px, top + row_height / 2), value, 9,
                  RED_TEXT if is_fault else (GREEN_TEXT if col > 0 else "#CBD5E1"), col > 0, anchor)
            if is_fault:
                highlighted = (cell_x1, top, cell_x2, top + row_height)
    return highlighted


def dme_transmitter_screen(draw: ImageDraw.ImageDraw, fault: bool = False) -> tuple[int, int, int, int] | None:
    x1, x2 = LEFT_W, RIGHT_X
    box(draw, (x1, BODY_TOP, x2, BODY_BOTTOM), WORKSPACE)
    box(draw, (x1, BODY_TOP, x2, BODY_TOP + 44), PANEL)
    draw.line((x1, BODY_TOP + 43, x2, BODY_TOP + 43), fill=LINE)
    label(draw, (x1 + 14, BODY_TOP + 22), "Transmitter Data", 14, TEXT, True, "lm")
    tab_y = BODY_TOP + 44
    box(draw, (x1, tab_y, x2, tab_y + 39), SIDEBAR)
    for index, tab in enumerate(("Transmitter Data", "RTC Data")):
        tab_x = x1 + 12 + index * 132
        box(draw, (tab_x, tab_y + 8, tab_x + 126, tab_y + 39), PANEL_ALT if index == 0 else PANEL,
            "#475569" if index == 0 else LINE)
        label(draw, (tab_x + 12, tab_y + 24), tab, 9, "white" if index == 0 else MUTED, True, "lm")

    panel_x1, panel_x2 = x1 + 14, x2 - 14
    panel_y1 = tab_y + 52
    box(draw, (panel_x1, panel_y1, panel_x2, panel_y1 + 278), PANEL, LINE)
    box(draw, (panel_x1, panel_y1, panel_x2, panel_y1 + 34), PANEL_ALT)
    label(draw, (panel_x1 + 12, panel_y1 + 17), "Power Amplifiers", 11, TEXT, True, "lm")
    columns = (("Power Amplifier", 120), ("VSWR", 70), ("Long Pulse Fault", 96),
               ("Power Supply", 88), ("Output Power", 88), ("RMS Temperature", 100),
               ("User Enabled", 92), ("Control", 100))
    header_y = panel_y1 + 34
    box(draw, (panel_x1, header_y, panel_x2, header_y + 44), TABLE_HEAD)
    x = panel_x1
    col_positions: list[tuple[int, int]] = []
    for title, width in columns:
        col_positions.append((x, x + width))
        wrapped(draw, (x + 5, header_y + 8), title, width - 10, 8, MUTED, True, 2, 2)
        x += width
    highlighted = None
    rows = ("PA 1", "PA 2", "PA 3", "PA 4")
    for row_index, row in enumerate(rows):
        top = header_y + 44 + row_index * 45
        draw.line((panel_x1, top, panel_x2, top), fill=LINE_SOFT)
        label(draw, (panel_x1 + 10, top + 22), row, 9, "#CBD5E1", True, "lm")
        for col_index, (cx1, cx2) in enumerate(col_positions[1:], start=1):
            alarm = fault and row_index == 0 and col_index == 4
            color = RED if alarm else (GREEN if col_index not in (2,) else MUTED_DARK)
            indicator(draw, int((cx1 + cx2) / 2), top + 22, color)
            if alarm:
                highlighted = (cx1 + 5, top + 4, cx2 - 5, top + 40)
        box(draw, (col_positions[-1][0] + 6, top + 9, col_positions[-1][1] - 6, top + 35), SIDEBAR, "#475569")
        label(draw, ((col_positions[-1][0] + col_positions[-1][1]) / 2, top + 22), "Auto", 8, MUTED, False, "mm")

    status_y = panel_y1 + 292
    box(draw, (panel_x1, status_y, panel_x1 + 430, status_y + 135), PANEL, LINE)
    box(draw, (panel_x1, status_y, panel_x1 + 430, status_y + 32), PANEL_ALT)
    label(draw, (panel_x1 + 12, status_y + 16), "Status", 11, TEXT, True, "lm")
    for index, condition in enumerate(("Comm Fault", "Maintenance Alert")):
        y = status_y + 58 + index * 34
        label(draw, (panel_x1 + 12, y), condition, 9, "#CBD5E1", True, "lm")
        for tx_index, tx in enumerate(("Tx 1", "Tx 2")):
            cx = panel_x1 + 248 + tx_index * 92
            box(draw, (cx, y - 12, cx + 74, y + 12), GREEN_BG, "#1D6837")
            label(draw, (cx + 37, y), f"{tx}: OK", 8, GREEN_TEXT, True, "mm")
    return highlighted


def transmitter_screen(draw: ImageDraw.ImageDraw, fault: bool = False, module: str = "vor") -> tuple[int, int, int, int] | None:
    if module == "dme":
        return dme_transmitter_screen(draw, fault)
    x1, x2 = LEFT_W, RIGHT_X
    box(draw, (x1, BODY_TOP, x2, BODY_BOTTOM), WORKSPACE)
    box(draw, (x1, BODY_TOP, x2, BODY_TOP + 44), PANEL)
    draw.line((x1, BODY_TOP + 43, x2, BODY_TOP + 43), fill=LINE)
    label(draw, (x1 + 14, BODY_TOP + 22), "Transmitter Data", 14, TEXT, True, "lm")
    tab_y = BODY_TOP + 44
    box(draw, (x1, tab_y, x2, tab_y + 39), SIDEBAR)
    tabs = (("Transmitter Data", True), ("Ground Check #1", False), ("Ground Check #2", False),
            ("Status Tx #1", False), ("Status Tx #2", False))
    tab_x = x1 + 12
    for tab, active in tabs:
        width = int(draw.textlength(tab, font=font(9, True))) + 20
        box(draw, (tab_x, tab_y + 8, tab_x + width, tab_y + 39), PANEL_ALT if active else PANEL,
            "#475569" if active else LINE)
        label(draw, (tab_x + 10, tab_y + 24), tab, 9, "white" if active else MUTED_DARK, True, "lm")
        tab_x += width + 4

    content_top = tab_y + 50
    fault_rect = table_panel(
        draw, (x1 + 12, content_top, x1 + 386, content_top + 170), "Power",
        ("Parameter", "Tx #1", "Tx #2", "Unit"),
        (("Carrier Forward", "47.2", "100.0", "W"), ("Carrier Reflected", "0.018", "0.012", "W"),
         ("Sideband Forward", "7.6", "7.8", "W")),
        (0, 1) if fault else None,
    )
    table_panel(
        draw, (x1 + 398, content_top, x2 - 12, content_top + 170), "VSWR",
        ("Parameter", "VSWR"), (("Carrier", "1.18"), ("Sideband 1", "1.05"), ("Sideband 2", "1.07")),
    )
    table_panel(
        draw, (x1 + 12, content_top + 182, x2 - 12, content_top + 392), "Frequency",
        ("Parameter", "Value 1", "Value 2", "Unit"),
        (("Carrier", "112.3000", "112.3001", "MHz"), ("30 Hz", "29.98", "30.01", "Hz"),
         ("9960 Hz", "9960.0", "9959.8", "Hz"), ("Ident", "1020", "1020", "Hz")),
    )
    return fault_rect


def field(draw: ImageDraw.ImageDraw, x: int, y: int, width: int, title: str, value: str,
          height: int = 31, multiline: bool = False, active: bool = False) -> None:
    label(draw, (x, y), title, 9, MUTED, True)
    box(draw, (x, y + 15, x + width, y + 15 + height), SIDEBAR, BLUE_LIGHT if active else "#475569", 2 if active else 1)
    if multiline:
        wrapped(draw, (x + 8, y + 22), value, width - 16, 9, "white", False, 3, 3)
    else:
        label(draw, (x + 8, y + 15 + height / 2), fit_text(draw, value, width - 16, 10), 10, "white", False, "lm")


def author_panel(draw: ImageDraw.ImageDraw, step: int, module: str = "vor") -> tuple[int, int, int, int]:
    x = RIGHT_X
    box(draw, (x, BODY_TOP, WIDTH, BODY_BOTTOM), PANEL)
    draw.line((x, BODY_TOP, x, BODY_BOTTOM), fill=LINE)
    label(draw, (x + 16, BODY_TOP + 20), "Xây dựng kịch bản", 14, "white", True, "lm")
    label(draw, (x + 16, BODY_TOP + 39), "Chỉnh trực tiếp trên PMDT", 9, MUTED, False, "lm")
    save_fill = "#166534" if step == 4 else BLUE_DARK
    box(draw, (WIDTH - 82, BODY_TOP + 9, WIDTH - 14, BODY_TOP + 39), save_fill)
    label(draw, (WIDTH - 48, BODY_TOP + 24), "Đã lưu" if step == 4 else "Lưu", 10, "white", True, "mm")
    draw.line((x + 14, BODY_TOP + 52, WIDTH - 14, BODY_TOP + 52), fill=LINE)

    title_y = BODY_TOP + 68
    label(draw, (x + 16, title_y), "Thông tin bài thực hành", 11, TEXT, True)
    active_meta = step == 0
    scenario_title = "Suy giảm công suất PA1" if module == "dme" else "Mất công suất phát Tx1"
    scenario_description = ("Chẩn đoán cảnh báo Output Power trên Power Amplifier"
                            if module == "dme" else "Chẩn đoán suy giảm công suất bộ phát chính")
    scenario_prompt = ("Xác định PA lỗi và quy trình chuyển máy phù hợp."
                       if module == "dme" else "Xác định nguyên nhân và quy trình xử lý phù hợp.")
    selected_field_id = "paStatus.0.outputPower" if module == "dme" else "txPower.0.tx1"
    selected_value = "red" if module == "dme" else "47.2"
    selected_status = "alarm" if module == "dme" else "red"
    field(draw, x + 16, title_y + 25, 288, "Tiêu đề", scenario_title, active=active_meta)
    field(draw, x + 16, title_y + 77, 288, "Mô tả", scenario_description, 38, True)
    field(draw, x + 16, title_y + 140, 288, "Đề bài", scenario_prompt, 45, True)
    field(draw, x + 16, title_y + 210, 288, "Độ khó", "Trung bình")

    section_y = title_y + 262
    draw.line((x + 14, section_y, WIDTH - 14, section_y), fill=LINE)
    label(draw, (x + 16, section_y + 17), "Giá trị / màu sự cố", 11, TEXT, True)
    selected = step in (1, 2, 3, 4)
    label(draw, (x + 16, section_y + 40), selected_field_id if selected else "Chọn một ô giá trị trên PMDT", 9,
          BLUE_LIGHT if selected else MUTED, False)
    if selected:
        field(draw, x + 16, section_y + 56, 136, "Giá trị", selected_value, active=step == 2)
        field(draw, x + 168, section_y + 56, 136, "Màu / trạng thái", selected_status, active=step == 2)
        box(draw, (x + 16, section_y + 108, x + 270, section_y + 138), BLUE_DARK)
        label(draw, (x + 143, section_y + 123), "Áp dụng", 10, "white", True, "mm")

    checkpoint_y = section_y + 152
    draw.line((x + 14, checkpoint_y, WIDTH - 14, checkpoint_y), fill=LINE)
    label(draw, (x + 16, checkpoint_y + 17), "Các bước kiểm tra chuẩn", 11, TEXT, True)
    box(draw, (WIDTH - 108, checkpoint_y + 7, WIDTH - 14, checkpoint_y + 31), PANEL, "#475569")
    label(draw, (WIDTH - 61, checkpoint_y + 19), "+ Thêm màn hình", 8, TEXT, True, "mm")
    if step >= 3:
        box(draw, (x + 16, checkpoint_y + 42, WIDTH - 16, checkpoint_y + 79), SIDEBAR, LINE)
        label(draw, (x + 28, checkpoint_y + 60), "01", 9, MUTED, True, "lm")
        label(draw, (x + 57, checkpoint_y + 60), "Transmitters > Data > Transmitter Data", 8, TEXT, False, "lm")

    if step == 0:
        return (x + 8, title_y + 15, WIDTH - 8, title_y + 258)
    if step == 1:
        return (RIGHT_X + 8, section_y + 28, WIDTH - 8, section_y + 55)
    if step == 2:
        return (RIGHT_X + 8, section_y + 48, WIDTH - 8, section_y + 144)
    if step == 3:
        return (RIGHT_X + 8, checkpoint_y + 2, WIDTH - 8, min(BODY_BOTTOM - 8, checkpoint_y + 86))
    return (WIDTH - 90, BODY_TOP + 2, WIDTH - 6, BODY_TOP + 46)


def answer_field(draw: ImageDraw.ImageDraw, x: int, y: int, title: str, value: str, active: bool = False) -> None:
    label(draw, (x, y), title, 8, MUTED, True)
    box(draw, (x, y + 13, WIDTH - 16, y + 65), SIDEBAR, BLUE_LIGHT if active else "#475569", 2 if active else 1, 4)
    wrapped(draw, (x + 8, y + 21), value, 270, 9, "white", False, 3, 2)


def student_panel(draw: ImageDraw.ImageDraw, step: int, module: str = "vor") -> tuple[int, int, int, int]:
    x = RIGHT_X
    box(draw, (x, BODY_TOP, WIDTH, BODY_BOTTOM), PANEL)
    draw.line((x, BODY_TOP, x, BODY_BOTTOM), fill=LINE)
    draw.rectangle((x + 16, BODY_TOP + 15, x + 27, BODY_TOP + 29), outline="#93C5FD", width=2)
    draw.line((x + 19, BODY_TOP + 12, x + 24, BODY_TOP + 12), fill="#93C5FD", width=2)
    draw.line((x + 19, BODY_TOP + 19, x + 24, BODY_TOP + 19), fill="#93C5FD", width=1)
    label(draw, (x + 45, BODY_TOP + 24), "Nhật ký học viên", 14, "#93C5FD", True, "lm")
    prompt = ("Kiểm tra cảnh báo Output Power PA1, xác định bộ khuếch đại lỗi và đề xuất chuyển máy."
              if module == "dme" else
              "Kiểm tra suy giảm công suất phát Tx1, xác định căn cứ chẩn đoán và đề xuất hướng khắc phục.")
    wrapped(draw, (x + 16, BODY_TOP + 52), prompt, 286, 10, MUTED, False, 4, 4)
    draw.line((x, BODY_TOP + 118, WIDTH, BODY_TOP + 118), fill=LINE)

    label(draw, (x + 16, BODY_TOP + 140), "MÀN HÌNH VÀ THAO TÁC ĐÃ GHI NHẬN", 9, "#CBD5E1", True)
    event_y = BODY_TOP + 162
    if step >= 2:
        box(draw, (x + 16, event_y, WIDTH - 16, event_y + 80), SIDEBAR, LINE, radius=5)
        label(draw, (x + 28, event_y + 18), "01", 9, BLUE_LIGHT, True, "lm")
        label(draw, (x + 56, event_y + 18), "Transmitter Data", 10, "white", True, "lm")
        label(draw, (x + 56, event_y + 37), "Transmitters › Data › Transmitter Data", 8, MUTED_DARK)
        label(draw, (x + 56, event_y + 57),
              "Kết quả: red · alarm" if module == "dme" else "Kết quả: 47.2 · red", 8, "#FACC15")
    else:
        box(draw, (x + 16, event_y, WIDTH - 16, event_y + 72), PANEL, "#475569", radius=5)
        wrapped(draw, (x + 28, event_y + 17), "Chọn menu và tab trên PMDT. Mỗi màn hình đã mở sẽ xuất hiện tại đây.", 264, 9, MUTED, False, 3, 3)

    conclusion_y = event_y + 96
    draw.line((x + 16, conclusion_y, WIDTH - 16, conclusion_y), fill=LINE)
    label(draw, (x + 16, conclusion_y + 18), "KẾT LUẬN SỰ CỐ", 9, "#CBD5E1", True)
    filled = step >= 3
    answer_field(draw, x + 16, conclusion_y + 39, "Vị trí / sự cố nghi ngờ",
                 (("Power Amplifier 1 lỗi Output Power." if module == "dme" else
                   "Khối khuếch đại công suất Tx1 suy giảm.") if filled else ""), active=step == 3)
    answer_field(draw, x + 16, conclusion_y + 113, "Căn cứ chẩn đoán",
                 (("PA1 hiển thị đỏ trong Transmitter Data." if module == "dme" else
                   "Carrier Forward Tx1 thấp hơn giá trị chuẩn.") if filled else ""), active=step == 3)
    answer_field(draw, x + 16, conclusion_y + 187, "Hướng khắc phục",
                 (("Chuyển Tx dự phòng, kiểm tra PA1 và nguồn." if module == "dme" else
                   "Chuyển máy dự phòng, kiểm tra PA và đường RF.") if filled else ""), active=step == 3)

    button_y = BODY_BOTTOM - 46
    box(draw, (x + 16, button_y, WIDTH - 16, BODY_BOTTOM - 10), "#166534" if step == 4 else BLUE)
    label(draw, ((x + WIDTH) / 2, button_y + 18), "ĐÃ NỘP BÀI" if step == 4 else "Nộp bài cho giám khảo", 11, "white", True, "mm")

    if step == 0:
        return (x + 8, BODY_TOP + 4, WIDTH - 8, BODY_TOP + 116)
    if step == 1:
        return (500, TITLE_H, 700, BODY_TOP + 110)
    if step == 2:
        return (x + 8, event_y - 8, WIDTH - 8, event_y + 88)
    if step == 3:
        return (x + 8, conclusion_y + 27, WIDTH - 8, button_y - 4)
    return (x + 8, button_y - 6, WIDTH - 8, BODY_BOTTOM - 4)


def status_bar(draw: ImageDraw.ImageDraw, author: bool) -> None:
    box(draw, (0, BODY_BOTTOM, WIDTH, HEIGHT), SIDEBAR)
    draw.line((0, BODY_BOTTOM, WIDTH, BODY_BOTTOM), fill=LINE)
    label(draw, (12, BODY_BOTTOM + 14), "Transmitters > Data > Transmitter Data", 9, "#CBD5E1", False, "lm")
    label(draw, (875, BODY_BOTTOM + 14), "Authoring" if author else "Student session", 9, MUTED, False, "rm")
    draw.line((888, BODY_BOTTOM + 5, 888, HEIGHT - 5), fill=LINE)
    indicator(draw, 909, BODY_BOTTOM + 14, GREEN)
    label(draw, (922, BODY_BOTTOM + 14), "RMS connected", 9, MUTED, False, "lm")
    draw.line((1040, BODY_BOTTOM + 5, 1040, HEIGHT - 5), fill=LINE)
    label(draw, (1266, BODY_BOTTOM + 14), "17/07/2026 14:32:18", 9, "#CBD5E1", False, "rm")


def highlight(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int], step: int, caption: str) -> None:
    x1, y1, x2, y2 = bounds
    draw.rounded_rectangle((x1, y1, x2, y2), radius=7, outline="#FACC15", width=3)
    # A compact annotation bar keeps the simulator visible while making each slide self-explanatory.
    bar_x1, bar_x2 = LEFT_W + 18, RIGHT_X - 18
    bar_y1, bar_y2 = BODY_BOTTOM - 66, BODY_BOTTOM - 14
    box(draw, (bar_x1, bar_y1, bar_x2, bar_y2), "#020617", BLUE_LIGHT, 2, 8)
    draw.ellipse((bar_x1 + 13, bar_y1 + 11, bar_x1 + 43, bar_y1 + 41), fill=BLUE)
    label(draw, (bar_x1 + 28, bar_y1 + 26), str(step + 1), 14, "white", True, "mm")
    label(draw, (bar_x1 + 56, bar_y1 + 26), caption, 15, "white", True, "lm")
    for index in range(SLIDE_COUNT):
        color = BLUE_LIGHT if index == step else "#475569"
        draw.ellipse((bar_x2 - 94 + index * 17, bar_y1 + 23, bar_x2 - 86 + index * 17, bar_y1 + 31), fill=color)


# Website shell colors from globals.css and the AppShell/ExamWorkspace components.
WEB_BG = "#F4F7FA"
WEB_SURFACE = "#FFFFFF"
WEB_MUTED = "#EDF3F7"
WEB_INK = "#142433"
WEB_TEXT = "#506477"
WEB_LINE = "#D5E0E8"
WEB_ACCENT = "#0077B6"
WEB_ACCENT_SOFT = "#E2F2FA"


def pointer(draw: ImageDraw.ImageDraw, x: int, y: int) -> None:
    points = ((x, y), (x + 5, y + 29), (x + 12, y + 21), (x + 20, y + 35),
              (x + 27, y + 31), (x + 19, y + 18), (x + 31, y + 17))
    draw.polygon(points, fill="white", outline=WEB_INK)


def web_shell(draw: ImageDraw.ImageDraw, role: str | None = None) -> None:
    box(draw, (0, 0, WIDTH, HEIGHT), WEB_BG)
    box(draw, (0, 0, WIDTH, 72), WEB_SURFACE)
    draw.line((0, 71, WIDTH, 71), fill=WEB_LINE)
    box(draw, (0, 0, 80, 72), WEB_SURFACE)
    draw.line((79, 0, 79, HEIGHT), fill=WEB_LINE)
    label(draw, (40, 36), "ATTECH", 16, "#005D8F", True, "mm")
    label(draw, (100, 23), "TRUNG TÂM BẢO ĐẢM KỸ THUẬT", 11, WEB_TEXT, True)
    label(draw, (100, 44), "Hệ thống kiểm tra mô phỏng CNS", 15, WEB_INK, True)
    box(draw, (1090, 18, 1252, 55), WEB_SURFACE, WEB_LINE, radius=8)
    draw.ellipse((1108, 28, 1124, 44), outline=WEB_ACCENT, width=2)
    label(draw, (1140, 36), "Cổng hệ thống", 12, WEB_TEXT, True, "lm")

    nav = (("⌂", "Trang chủ", role is None), ("◇", "Giám khảo", role == "examiner"),
           ("○", "Thí sinh", role == "candidate"))
    for index, (symbol, title, active) in enumerate(nav):
        y = 100 + index * 84
        if active:
            box(draw, (8, y, 71, y + 64), WEB_SURFACE, "#A7D7ED", radius=8)
        label(draw, (39, y + 21), symbol, 21, "#597084", False, "mm")
        label(draw, (39, y + 47), title, 9, WEB_TEXT, True, "mm")


def web_annotation(draw: ImageDraw.ImageDraw, bounds: tuple[int, int, int, int], step: int, caption: str) -> None:
    x1, y1, x2, y2 = bounds
    draw.rounded_rectangle((x1, y1, x2, y2), radius=8, outline="#F59E0B", width=4)
    bar_y1, bar_y2 = 654, 707
    box(draw, (104, bar_y1, 1252, bar_y2), WEB_SURFACE, WEB_ACCENT, 2, 9)
    draw.ellipse((120, bar_y1 + 11, 151, bar_y1 + 42), fill=WEB_ACCENT)
    label(draw, (135.5, bar_y1 + 26.5), str(step + 1), 14, "white", True, "mm")
    label(draw, (166, bar_y1 + 26), caption, 15, WEB_INK, True, "lm")
    for index in range(SLIDE_COUNT):
        color = WEB_ACCENT if index == step else "#BCCAD4"
        draw.ellipse((1112 + index * 17, bar_y1 + 23, 1120 + index * 17, bar_y1 + 31), fill=color)


def paste_home_image(image: Image.Image) -> None:
    source_path = ROOT / "public" / "images" / "cns-image.webp"
    if not source_path.exists():
        return
    with Image.open(source_path) as source:
        source = source.convert("RGB")
        target_w, target_h = 500, 480
        scale = max(target_w / source.width, target_h / source.height)
        resized = source.resize((round(source.width * scale), round(source.height * scale)), Image.Resampling.LANCZOS)
        left = max(0, (resized.width - target_w) // 2)
        top = max(0, (resized.height - target_h) // 2)
        image.paste(resized.crop((left, top, left + target_w, top + target_h)), (744, 108))


def role_card(draw: ImageDraw.ImageDraw, y: int, title: str, description: str, action: str, selected: bool) -> tuple[int, int, int, int]:
    bounds = (116, y, 676, y + 126)
    box(draw, bounds, WEB_SURFACE, "#9FD2E8" if selected else WEB_LINE, 2 if selected else 1, 12)
    box(draw, (138, y + 22, 182, y + 66), WEB_ACCENT_SOFT, radius=9)
    if title == "Giám khảo":
        draw.rectangle((150, y + 33, 170, y + 53), outline=WEB_ACCENT, width=2)
        draw.line((155, y + 29, 165, y + 29), fill=WEB_ACCENT, width=2)
    else:
        draw.ellipse((153, y + 29, 167, y + 43), outline=WEB_ACCENT, width=2)
        draw.arc((148, y + 39, 172, y + 61), 190, 350, fill=WEB_ACCENT, width=2)
    label(draw, (200, y + 28), title, 17, WEB_INK, True)
    wrapped(draw, (200, y + 54), description, 405, 11, WEB_TEXT, False, 4, 2)
    label(draw, (200, y + 101), action, 11, WEB_ACCENT, True)
    label(draw, (648, y + 35), "→", 19, WEB_ACCENT, False, "mm")
    return bounds


def home_website_slide(role: str) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), WEB_BG)
    draw = ImageDraw.Draw(image)
    web_shell(draw)
    label(draw, (116, 108), "NỀN TẢNG HUẤN LUYỆN THEO PHƯƠNG PHÁP CBTA", 11, WEB_ACCENT, True)
    wrapped(draw, (116, 138), "Kiểm tra đánh giá năng lực dựa trên thực tế vận hành hệ thống CNS",
            590, 32, WEB_INK, True, 4, 3)
    label(draw, (116, 250), "Chọn không gian làm việc phù hợp với vai trò của bạn.", 13, WEB_TEXT)
    examiner = role == "examiner"
    first = role_card(draw, 292, "Giám khảo", "Xây dựng, hiệu chỉnh kịch bản và đánh giá kết quả thực hành.",
                      "Quản lý kịch bản", examiner)
    second = role_card(draw, 430, "Thí sinh", "Chọn bài thực hành và xử lý sự cố trên thiết bị mô phỏng.",
                       "Vào khu vực thực hành", not examiner)
    box(draw, (736, 100, 1252, 604), WEB_SURFACE, WEB_LINE, radius=16)
    paste_home_image(image)
    draw = ImageDraw.Draw(image)
    selected = first if examiner else second
    pointer(draw, selected[2] - 54, selected[1] + 84)
    web_annotation(draw, selected, 0, f"Từ Trang chủ, chọn grid {'Giám khảo' if examiner else 'Thí sinh'}")
    return image


def module_tabs(draw: ImageDraw.ImageDraw, active: str, y: int) -> None:
    box(draw, (118, y, 430, y + 45), WEB_MUTED, WEB_LINE, radius=8)
    for index, module in enumerate(("VOR", "DME", "ADS-B")):
        x1 = 123 + index * 101
        if module.lower().replace("-", "") == active.replace("-", ""):
            box(draw, (x1, y + 5, x1 + 96, y + 40), WEB_SURFACE, WEB_LINE, radius=6)
        label(draw, (x1 + 48, y + 22), module, 11,
              WEB_ACCENT if module.lower().replace("-", "") == active.replace("-", "") else WEB_TEXT, True, "mm")


def dashboard_website_slide(role: str, module: str) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), WEB_BG)
    draw = ImageDraw.Draw(image)
    web_shell(draw, role)
    examiner = role == "examiner"
    eyebrow = "QUẢN TRỊ KỲ KIỂM TRA" if examiner else "THỰC HÀNH VÀ ĐÁNH GIÁ"
    title = "Quản lý kịch bản kiểm tra" if examiner else "Bài thực hành mô phỏng CNS"
    label(draw, (118, 98), eyebrow, 10, WEB_ACCENT, True)
    label(draw, (118, 124), title, 27, WEB_INK, True)
    label(draw, (118, 164), "Chọn phân hệ và nội dung cần thao tác.", 12, WEB_TEXT)
    module_tabs(draw, module, 198)
    display_module = "ADS-B" if module == "ads-b" else module.upper()

    if examiner:
        summary_title = ({"vor": "PMDT Simulator - DVOR 1150A", "dme": "PMDT Simulator - DME 1118A/1119A",
                          "ads-b": "Mô phỏng giám sát ADS-B"})[module]
        box(draw, (118, 260, 1252, 352), WEB_SURFACE, WEB_LINE, radius=12)
        box(draw, (140, 282, 184, 326), WEB_ACCENT_SOFT, radius=9)
        label(draw, (162, 304), "◉", 20, WEB_ACCENT, True, "mm")
        label(draw, (202, 282), summary_title, 17, WEB_INK, True)
        label(draw, (202, 309), "Xây dựng tình huống và quy trình đánh giá trên simulator.", 11, WEB_TEXT)
        create_x1 = 1030 if module != "ads-b" else 1040
        box(draw, (create_x1, 284, 1232, 328), WEB_ACCENT, radius=7)
        label(draw, ((create_x1 + 1232) / 2, 306), f"Tạo kịch bản {display_module}", 11, "white", True, "mm")
        label(draw, (118, 382), f"Danh sách kịch bản {display_module}", 16, WEB_INK, True)
        row_y = 414
        box(draw, (118, row_y, 1252, row_y + 118), WEB_SURFACE, WEB_LINE, radius=10)
        box(draw, (140, row_y + 38, 176, row_y + 74), WEB_MUTED, WEB_LINE, radius=6)
        label(draw, (158, row_y + 56), "01", 10, WEB_TEXT, True, "mm")
        scenario_title = ({"vor": "Mất công suất phát Tx1", "dme": "Suy giảm công suất PA1",
                           "ads-b": "Khôi phục kết nối Sensor A"})[module]
        label(draw, (198, row_y + 30), scenario_title, 15, WEB_INK, True)
        label(draw, (198, row_y + 57), "Trung bình · 3 bước kiểm tra", 10, WEB_TEXT)
        edit_bounds = (1080, row_y + 35, 1152, row_y + 79)
        box(draw, edit_bounds, WEB_SURFACE, "#AEBECB", radius=6)
        label(draw, (1116, row_y + 57), "Sửa", 11, WEB_INK, True, "mm")
        draw.rounded_rectangle((create_x1 - 4, 280, 1236, 332), radius=9, outline="#F59E0B", width=3)
        draw.rounded_rectangle((edit_bounds[0] - 4, edit_bounds[1] - 4, edit_bounds[2] + 4, edit_bounds[3] + 4), radius=8, outline="#F59E0B", width=3)
        pointer(draw, create_x1 + 130, 320)
        web_annotation(draw, (create_x1 - 4, 280, 1236, 332), 1,
                       f"Chọn {display_module}: tạo kịch bản mới hoặc nhấn Sửa kịch bản đã có")
    else:
        label(draw, (118, 278), f"Thực hành xử lý sự cố {display_module}", 17, WEB_INK, True)
        label(draw, (118, 306), "Chọn một kịch bản được giao để bắt đầu thực hành.", 11, WEB_TEXT)
        list_y = 340
        box(draw, (118, list_y, 1252, list_y + 128), WEB_SURFACE, WEB_LINE, radius=11)
        box(draw, (140, list_y + 44, 176, list_y + 80), WEB_MUTED, WEB_LINE, radius=6)
        label(draw, (158, list_y + 62), "01", 10, WEB_TEXT, True, "mm")
        scenario_title = ({"vor": "Mất công suất phát Tx1", "dme": "Suy giảm công suất PA1",
                           "ads-b": "Khôi phục kết nối Sensor A"})[module]
        label(draw, (198, list_y + 34), scenario_title, 15, WEB_INK, True)
        label(draw, (198, list_y + 64), "Trung bình · Thực hành theo tình huống vận hành", 10, WEB_TEXT)
        start_bounds = (1080, list_y + 42, 1228, list_y + 86)
        box(draw, start_bounds, WEB_ACCENT, radius=7)
        label(draw, (1154, list_y + 64), "Bắt đầu  →", 11, "white", True, "mm")
        pointer(draw, 1178, list_y + 80)
        web_annotation(draw, start_bounds, 1, f"Chọn phân hệ {display_module} và mở kịch bản thực hành")
    return image


def adsb_wizard_slide(step: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), WEB_BG)
    draw = ImageDraw.Draw(image)
    web_shell(draw, "examiner")
    label(draw, (116, 92), "GIÁM KHẢO / ADS-B", 10, WEB_ACCENT, True)
    label(draw, (116, 118), "Xây dựng kịch bản ADS-B", 24, WEB_INK, True)
    steps = ("Thông tin", "Site và cảm biến", "Vai trò đăng nhập", "Thao tác chuẩn", "Sự cố phần cứng")
    nav_y = 164
    for index, title in enumerate(steps):
        x1 = 116 + index * 226
        color = WEB_ACCENT if index == step else WEB_TEXT
        draw.line((x1, nav_y + 36, x1 + 210, nav_y + 36), fill=WEB_ACCENT if index == step else WEB_LINE, width=3)
        label(draw, (x1, nav_y), str(index + 1), 10, color, True)
        label(draw, (x1 + 22, nav_y), title, 10, color, index == step)
    card = (116, 222, 1252, 622)
    box(draw, card, WEB_SURFACE, WEB_LINE, radius=11)
    label(draw, (146, 250), f"Bước {step + 1} trong 5", 10, WEB_ACCENT, True)
    headings = ("Thông tin kịch bản", "Cấu hình trạng thái ban đầu", "Chọn vai trò đăng nhập",
                "Xây dựng đáp án thao tác", "Kịch bản sự cố phần cứng")
    label(draw, (146, 279), headings[step], 20, WEB_INK, True)
    draw.line((146, 310, 1222, 310), fill=WEB_LINE)

    if step == 0:
        label(draw, (146, 338), "Tiêu đề kịch bản", 11, WEB_INK, True)
        box(draw, (146, 359, 1222, 399), WEB_MUTED, "#AEBECB", radius=5)
        label(draw, (160, 379), "Khôi phục kết nối Sensor A", 11, WEB_INK, False, "lm")
        label(draw, (146, 425), "Mô tả", 11, WEB_INK, True)
        box(draw, (146, 446, 1222, 522), WEB_MUTED, "#AEBECB", radius=5)
        wrapped(draw, (160, 460), "Sensor A mất phản hồi SNMP. Thí sinh xác định đúng thiết bị và thực hiện quy trình khôi phục.", 1010, 11, WEB_TEXT)
        for index, difficulty in enumerate(("Cơ bản", "Trung bình", "Nâng cao")):
            x1 = 146 + index * 220
            box(draw, (x1, 548, x1 + 200, 594), WEB_ACCENT_SOFT if index == 1 else WEB_SURFACE,
                WEB_ACCENT if index == 1 else WEB_LINE, radius=7)
            label(draw, (x1 + 100, 571), difficulty, 10, WEB_INK, True, "mm")
    elif step == 1:
        label(draw, (146, 336), "Site 01 · Nội Bài", 13, WEB_INK, True)
        box(draw, (146, 366, 1222, 520), WEB_MUTED, WEB_LINE, radius=8)
        for index, sensor in enumerate(("Sensor A · 10.10.1.11", "Sensor B · 10.10.1.12")):
            x1 = 170 + index * 504
            selected = index == 0
            box(draw, (x1, 394, x1 + 470, 492), WEB_SURFACE, WEB_ACCENT if selected else WEB_LINE, 2 if selected else 1, 8)
            indicator(draw, x1 + 28, 423, RED if selected else GREEN)
            label(draw, (x1 + 48, 416), sensor, 12, WEB_INK, True)
            label(draw, (x1 + 48, 445), "Thiết bị mục tiêu" if selected else "Dự phòng", 10, WEB_TEXT)
        label(draw, (146, 550), "Chọn cảm biến mục tiêu và trạng thái cảnh báo ban đầu.", 11, WEB_TEXT)
    elif step == 2:
        label(draw, (146, 338), "Tài khoản thí sinh sẽ sử dụng", 12, WEB_INK, True)
        for index, (title, code, desc) in enumerate((("Quản trị hệ thống", "sysadmin", "Toàn quyền cấu hình"),
                                                     ("Bảo trì", "maintenance", "Kiểm tra và xử lý sự cố"))):
            x1 = 146 + index * 530
            selected = index == 1
            box(draw, (x1, 375, x1 + 500, 505), WEB_ACCENT_SOFT if selected else WEB_SURFACE,
                WEB_ACCENT if selected else WEB_LINE, 2 if selected else 1, 9)
            draw.ellipse((x1 + 22, 397, x1 + 42, 417), outline=WEB_ACCENT, width=2)
            if selected:
                draw.ellipse((x1 + 28, 403, x1 + 36, 411), fill=WEB_ACCENT)
            label(draw, (x1 + 58, 396), title, 14, WEB_INK, True)
            label(draw, (x1 + 58, 426), code, 11, WEB_ACCENT, True)
            label(draw, (x1 + 58, 456), desc, 10, WEB_TEXT)
    elif step == 3:
        box(draw, (146, 334, 760, 576), "#111827", "#333333", radius=8)
        label(draw, (166, 356), "SSH 10.10.1.11 · Ghi thao tác chuẩn", 11, "#D4D4D8", True)
        terminal_lines = ("login: maintenance", "Password: ********", "> status", "Sensor A: NO RESPONSE",
                          "> service snmp restart", "SNMP service restarted")
        for index, line in enumerate(terminal_lines):
            label(draw, (168, 390 + index * 27), line, 11, "#4ADE80" if line.startswith(">") else "#D4D4D8")
        box(draw, (784, 334, 1222, 576), WEB_MUTED, WEB_LINE, radius=8)
        label(draw, (806, 356), "Đáp án thao tác", 13, WEB_INK, True)
        for index, action in enumerate(("Đăng nhập tài khoản maintenance", "Kiểm tra trạng thái Sensor A", "Khởi động lại dịch vụ SNMP")):
            y = 392 + index * 54
            box(draw, (806, y, 1200, y + 42), WEB_SURFACE, WEB_LINE, radius=5)
            label(draw, (824, y + 21), f"{index + 1:02d}", 9, WEB_ACCENT, True, "lm")
            label(draw, (856, y + 21), action, 10, WEB_INK, False, "lm")
    else:
        label(draw, (146, 338), "Lỗi phần cứng mục tiêu", 12, WEB_INK, True)
        box(draw, (146, 370, 1222, 535), WEB_MUTED, WEB_LINE, radius=8)
        blocks = (("Antenna", GREEN), ("Receiver", GREEN), ("GPS Cable", RED), ("Network", GREEN), ("Power", GREEN))
        for index, (title, color) in enumerate(blocks):
            x1 = 170 + index * 195
            box(draw, (x1, 414, x1 + 160, 486), WEB_SURFACE, color, 2, 7)
            indicator(draw, x1 + 24, 450, color)
            label(draw, (x1 + 44, 450), title, 10, WEB_INK, True, "lm")
        box(draw, (1042, 552, 1222, 594), WEB_ACCENT, radius=7)
        label(draw, (1132, 573), "Lưu kịch bản", 11, "white", True, "mm")
    web_annotation(draw, (110, 216, 1258, 628), step + 2,
                   f"ADS-B · {headings[step]}")
    return image


def qcms_window(draw: ImageDraw.ImageDraw, sensor_modal: bool = False) -> None:
    box(draw, (92, 92, 1188, 610), "#8E9192", "#55595B")
    cx, cy = 640, 350
    for radius in (80, 150, 220):
        draw.ellipse((cx - radius, cy - radius, cx + radius, cy + radius), outline="#656869", width=1)
    draw.line((cx, 120, cx, 580), fill="#656869")
    draw.line((380, cy, 900, cy), fill="#656869")
    box(draw, (140, 128, 1140, 520), "#B9BBBC", "#202A64", 2)
    box(draw, (140, 128, 1140, 158), "#304A86")
    label(draw, (640, 143), "GROUND STATIONS", 12, "white", True, "mm")
    label(draw, (160, 180), "PROCESSING SYSTEM SITES 01-04", 10, "#1E2530", True)
    sites = (("01  NỘI BÀI", RED), ("02  ĐÀ NẴNG", GREEN), ("03  TÂN SƠN NHẤT", GREEN), ("04  CAM RANH", GREEN))
    for index, (title, color) in enumerate(sites):
        x1 = 160 + index * 238
        box(draw, (x1, 208, x1 + 218, 326), "#C3C6C7", "#8A8E90")
        box(draw, (x1 + 4, 212, x1 + 214, 238), "#9EAAC0")
        label(draw, (x1 + 12, 225), title, 9, "#1E2530", True, "lm")
        for sensor_index, sensor in enumerate(("A", "B")):
            y = 252 + sensor_index * 31
            indicator(draw, x1 + 19, y + 10, color if sensor_index == 0 else GREEN)
            label(draw, (x1 + 36, y + 10), f"Sensor {sensor}  10.10.{index + 1}.{11 + sensor_index}", 8, "#292C2E", True, "lm")
    label(draw, (160, 362), "REDUNDANT AND PASSIVE SITES 05-64", 10, "#35393B", True)
    for index in range(8):
        x1 = 160 + (index % 4) * 238
        y1 = 390 + (index // 4) * 52
        box(draw, (x1, y1, x1 + 218, y1 + 42), "#B1B4B5", "#8A8E90")
        label(draw, (x1 + 10, y1 + 21), f"{index + 5:02d}   ---   N/C", 8, "#666A6C", False, "lm")
    if sensor_modal:
        box(draw, (360, 174, 920, 552), "#C7C9CA", "#202A64", 3)
        box(draw, (360, 174, 920, 205), "#304A86")
        label(draw, (640, 189), "SENSOR A · MONITORING", 11, "white", True, "mm")
        metrics = (("SNMP Response", "NO RESPONSE", RED), ("Receiver Confidence", "0%", RED),
                   ("GPS Status", "UNAVAILABLE", RED), ("Temperature", "43 °C", GREEN))
        for index, (name, value, color) in enumerate(metrics):
            y = 238 + index * 58
            box(draw, (392, y, 888, y + 42), "#B9BBBC", "#8A8E90")
            label(draw, (410, y + 21), name, 9, "#292C2E", True, "lm")
            indicator(draw, 738, y + 21, color)
            label(draw, (862, y + 21), value, 9, "#292C2E", True, "rm")


def adsb_student_slide(step: int) -> Image.Image:
    image = Image.new("RGB", (WIDTH, HEIGHT), WEB_BG)
    draw = ImageDraw.Draw(image)
    web_shell(draw, "candidate")
    captions = ("Quan sát site và chọn Sensor A đang cảnh báo",
                "Mở Monitoring để đối chiếu dấu hiệu mất phản hồi",
                "Mở Terminal bảo trì và thực hiện chuỗi lệnh",
                "Chọn các thao tác cần nộp trong nhật ký",
                "Nộp bài để hệ thống đối chiếu quy trình chuẩn")
    if step in (0, 1):
        qcms_window(draw, sensor_modal=step == 1)
        target = (132, 120, 1148, 528) if step == 0 else (352, 166, 928, 560)
    else:
        label(draw, (110, 92), "Terminal bảo trì", 23, WEB_INK, True)
        label(draw, (110, 124), "Khôi phục kết nối Sensor A · 10.10.1.11", 11, WEB_TEXT)
        box(draw, (110, 156, 830, 610), "#0A0A0A", "#333333", radius=8)
        box(draw, (110, 156, 830, 198), "#1A1A1A", "#333333")
        for index, color in enumerate(("#FF5F57", "#FEBC2E", "#28C840")):
            draw.ellipse((128 + index * 24, 171, 140 + index * 24, 183), fill=color)
        label(draw, (218, 177), "SSH 10.10.1.11", 11, "#D4D4D8", True, "lm")
        terminal_lines = ("login: maintenance", "Password: ********", "Welcome to Quadrant Sensor",
                          "> status", "SNMP: NO RESPONSE", "> service snmp restart", "SNMP service restarted", "> status", "SNMP: RUNNING")
        for index, line in enumerate(terminal_lines):
            label(draw, (134, 226 + index * 34), line, 12, "#4ADE80" if line.startswith(">") else "#D4D4D8")
        box(draw, (850, 156, 1252, 610), WEB_SURFACE, WEB_LINE, radius=8)
        label(draw, (872, 184), "Thao tác đã ghi", 14, WEB_INK, True)
        actions = (("01", "Đăng nhập maintenance"), ("02", "Kiểm tra trạng thái"), ("03", "Khởi động lại SNMP"), ("04", "Xác nhận RUNNING"))
        for index, (number, action) in enumerate(actions):
            y = 222 + index * 65
            selected = step >= 3
            box(draw, (872, y, 1230, y + 52), "#EFF6FF" if selected else WEB_SURFACE, WEB_ACCENT if selected else WEB_LINE, radius=5)
            box(draw, (886, y + 13, 912, y + 39), WEB_ACCENT if selected else WEB_MUTED, radius=4)
            label(draw, (899, y + 26), "✓" if selected else number, 9, "white" if selected else WEB_TEXT, True, "mm")
            label(draw, (924, y + 26), action, 10, WEB_INK, True, "lm")
        submit = (872, 516, 1230, 566)
        box(draw, submit, "#166534" if step == 4 else WEB_ACCENT, radius=6)
        label(draw, (1051, 541), "ĐÃ NỘP BÀI" if step == 4 else "Nộp bài", 11, "white", True, "mm")
        target = (102, 148, 838, 618) if step == 2 else ((864, 212, 1238, 492) if step == 3 else (864, 508, 1238, 574))
    web_annotation(draw, target, step + 2, f"ADS-B · {captions[step]}")
    return image


EXAMINER_CAPTIONS = (
    "Nhập thông tin và yêu cầu của bài thực hành",
    "Chọn trực tiếp giá trị cần tạo sự cố trên PMDT",
    "Đặt giá trị và màu trạng thái cần đánh giá",
    "Ghi nhận màn hình vào quy trình kiểm tra chuẩn",
    "Lưu và hoàn tất kịch bản kiểm tra",
)

CANDIDATE_CAPTIONS = (
    "Đọc kỹ yêu cầu tình huống trong Nhật ký học viên",
    "Mở Transmitters > Data trên menu PMDT",
    "Quan sát số liệu và ghi nhận dấu hiệu bất thường",
    "Hoàn thành ba phần kết luận sự cố",
    "Nộp bài để Giám khảo đánh giá",
)


@lru_cache(maxsize=64)
def render_slide(role: str, module: str, slide: int) -> Image.Image:
    if slide == 0:
        return home_website_slide(role)
    if slide == 1:
        return dashboard_website_slide(role, module)

    pmdt_step = slide - 2
    if module == "ads-b":
        return adsb_wizard_slide(pmdt_step) if role == "examiner" else adsb_student_slide(pmdt_step)

    author = role == "examiner"
    image = Image.new("RGB", (WIDTH, HEIGHT), BG)
    draw = ImageDraw.Draw(image)
    title_bar(draw, author, "DME" if module == "dme" else "DVOR")
    menu_bar(draw, "Transmitters" if pmdt_step >= 1 else None,
             open_menu=(not author and pmdt_step == 1))
    pmdt_sidebar(draw, fault=pmdt_step >= 2, module=module)
    fault_rect = transmitter_screen(draw, fault=pmdt_step >= 1, module=module)
    panel_rect = (author_panel(draw, pmdt_step, module)
                  if author else student_panel(draw, pmdt_step, module))
    status_bar(draw, author)

    if author and pmdt_step == 1 and fault_rect:
        target = (fault_rect[0] - 4, fault_rect[1] - 4, fault_rect[2] + 4, fault_rect[3] + 4)
    elif not author and pmdt_step == 2 and fault_rect:
        target = (fault_rect[0] - 4, fault_rect[1] - 4, fault_rect[2] + 4, fault_rect[3] + 4)
    else:
        target = panel_rect
    module_label = module.upper()
    base_caption = EXAMINER_CAPTIONS[pmdt_step] if author else CANDIDATE_CAPTIONS[pmdt_step]
    highlight(draw, target, slide, f"{module_label} · {base_caption}")
    return image


def make_frame(role: str, module: str, t: float) -> Image.Image:
    slide = min(SLIDE_COUNT - 1, int(t / SLIDE_SECONDS))
    local = t - slide * SLIDE_SECONDS
    current = render_slide(role, module, slide)
    if slide < SLIDE_COUNT - 1 and local > SLIDE_SECONDS - TRANSITION_SECONDS:
        ratio = (local - (SLIDE_SECONDS - TRANSITION_SECONDS)) / TRANSITION_SECONDS
        ratio = ratio * ratio * (3 - 2 * ratio)
        return Image.blend(current, render_slide(role, module, slide + 1), ratio)
    return current.copy()


def encode(ffmpeg_exe: str, role: str, module: str, filename: str) -> None:
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)
    output = OUTPUT_DIR / filename
    command = [
        ffmpeg_exe, "-y", "-f", "rawvideo", "-vcodec", "rawvideo",
        "-pix_fmt", "rgb24", "-s", f"{WIDTH}x{HEIGHT}", "-r", str(FPS),
        "-i", "-", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "20",
        "-pix_fmt", "yuv420p", "-movflags", "+faststart", str(output),
    ]
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stderr=subprocess.PIPE)
    assert process.stdin is not None
    for index in range(round(DURATION * FPS)):
        process.stdin.write(make_frame(role, module, index / FPS).tobytes())
    process.stdin.close()
    stderr = process.stderr.read().decode("utf-8", errors="replace") if process.stderr else ""
    if process.wait() != 0:
        raise RuntimeError(f"FFmpeg failed for {filename}:\n{stderr}")
    # The middle slide is a representative poster and matches the actual encoded layout.
    render_slide(role, module, 4).save(output.with_suffix(".webp"), "WEBP", quality=91, method=6)
    print(f"Created {output.relative_to(ROOT)}")


def main() -> None:
    try:
        import imageio_ffmpeg
    except ImportError as exc:
        raise SystemExit("imageio-ffmpeg is required on PYTHONPATH.") from exc
    ffmpeg_exe = imageio_ffmpeg.get_ffmpeg_exe()
    outputs = (
        ("examiner", "vor", "huong-dan-giam-khao-vor.mp4"),
        ("examiner", "dme", "huong-dan-giam-khao-dme.mp4"),
        ("examiner", "ads-b", "huong-dan-giam-khao-ads-b.mp4"),
        ("candidate", "vor", "huong-dan-thi-sinh-vor.mp4"),
        ("candidate", "dme", "huong-dan-thi-sinh-dme.mp4"),
        ("candidate", "ads-b", "huong-dan-thi-sinh-ads-b.mp4"),
    )
    for role, module, filename in outputs:
        encode(ffmpeg_exe, role, module, filename)


if __name__ == "__main__":
    sys.exit(main())
