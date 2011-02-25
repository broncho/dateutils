/* ==============================================================================
 * Licensed under the Apache License, Version 2.0 (the "License"); you may not
 * use this file except in compliance with the License. You may obtain a copy of
 * the License at
 *
 * http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
 * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
 * License for the specific language governing permissions and limitations under
 * the License.
 */
(function($) {
  $.fn.continuousCalendar = function(options) {
    this.each(function() {
      _continuousCalendar.call($(this), options)
    })
    return this
    function _continuousCalendar(options) {
      $(this).addClass('continuousCalendarContainer')

      var defaults = {
        weeksBefore: 26,
        weeksAfter: 26,
        firstDate: null,
        lastDate: null,
        startField: $('input.startDate', this),
        endField: $('input.endDate', this),
        isPopup: false,
        selectToday: false,
        locale: DATE_LOCALE_EN,
        disableWeekends: false,
        callback: function() {
        }
      }
      var params = $.extend(defaults, options)
      var Status = {
        CREATE:'create',
        MOVE:'move',
        NONE:'none'
      }
      params.locale.init()
      var startDate = fieldDate(params.startField)
      var endDate = fieldDate(params.endField)
      if (params.selectToday) {
        var today = Date.NOW
        var formattedToday = formatDate(today)
        startDate = today
        endDate = today
        setStartField(formattedToday)
        setEndField(formattedToday)
      }
      var firstWeekdayOfGivenDate = (startDate || Date.NOW).getFirstDateOfWeek(params.locale.firstWeekday)
      var container = this
      var dateCells = []
      var dateCellDates = []
      var dateCellMap = {}
      var mouseDownDate = null
      var averageCellHeight
      var yearTitle
      var selection = DateRange.emptyRange()
      var oldSelection
      var calendarRange
      var status = Status.NONE
      var calendar
      var scrollContent
      var beforeFirstOpening = true
      var bodyTable

      createCalendar()
      function createCalendar() {
        if (startDate && endDate) {
          selection = new DateRange(startDate, endDate)
        }
        oldSelection = selection.clone()
        container.data('calendarRange', selection)
        var rangeStart = params.firstDate ? Date.parseDate(params.firstDate, params.locale.shortDateFormat) : firstWeekdayOfGivenDate.plusDays(-(params.weeksBefore * 7))
        var rangeEnd = params.lastDate ? Date.parseDate(params.lastDate, params.locale.shortDateFormat) : firstWeekdayOfGivenDate.plusDays(params.weeksAfter * 7 + 6)
        calendarRange = new DateRange(rangeStart, rangeEnd)
        var headerTable = $('<table>').addClass('calendarHeader').append(headerRow())
        bodyTable = $('<table>').addClass('calendarBody').append(calendarBody())
        scrollContent = $('<div>').addClass('calendarScrollContent').append(bodyTable)
        calendar = getCalendarContainerOrCreateOne()
        calendar.append(headerTable).append(scrollContent)
        if (params.isPopup) {
          isHidden = true
          calendar.addClass('popup').hide()
          var icon = $('<a href="#" class="calendarIcon">' + Date.NOW.getDate() + '</a>').click(toggleCalendar)
          container.append(icon)
        } else {
          calculateCellHeightAndSetScroll()
        }
        if ($('.startDateLabel', container).isEmpty()) {
          addDateLabels(container)
        }
        if ($('.rangeLengthLabel', container).isEmpty() && isRange()) {
          addRangeLengthLabel(container)
        }
        highlightToday()
        if (isRange()) {
          initRangeCalendarEvents(container, bodyTable)
          drawSelection()
        } else {
          initSingleDateCalendarEvents()
          var selectedDateKey = startDate && startDate.dateFormat('Ymd')
          if (dateCellMap[selectedDateKey]) {
            dateCells[dateCellMap[selectedDateKey]].addClass('selected')
          }
        }
        yearTitle = $('th.month', headerTable)
        scrollContent.scroll(setYearLabel)
        scrollToSelection()
        executeCallback()
      }

      function highlightToday() {
        var todayKey = Date.NOW.dateFormat('Ymd')
        if (dateCellMap[todayKey]) {
          dateCells[dateCellMap[todayKey]].addClass('today')
        }
      }

      function getCalendarContainerOrCreateOne() {
        var existingContainer = $('.continuousCalendar', container)
        if (existingContainer.exists()) {
          return existingContainer
        } else {
          var newContainer = $('<div>').addClass('continuousCalendar')
          container.append(newContainer)
          return newContainer
        }
      }

      function addDateLabels(container) {
        var dateLabelContainer = $('<div class="label">')
        dateLabelContainer.append('<span class="startDateLabel"></span>')
        if (isRange()) {
          dateLabelContainer.append('<span class="separator"> - </span>').append('<span class="endDateLabel"></span>')
        }
        container.append(dateLabelContainer)
        dateLabelContainer.click(toggleCalendar)
      }

      function addRangeLengthLabel(container) {
        var rangeLengthContainer = $('<div class="label">')
        rangeLengthContainer.append('<span class="rangeLengthLabel"></span>')
        $('.continuousCalendar', container).append(rangeLengthContainer)
      }

      function initRangeCalendarEvents(container, bodyTable) {
        $('span.rangeLengthLabel', container).text(Date.daysLabel(selection.days()))
        bodyTable.addClass('range')
        bodyTable.mousedown(mouseDown).mouseover(mouseMove).mouseup(mouseUp)
        disableTextSelection(bodyTable.get(0))
        setRangeLabels()
      }

      function scrollToSelection() {
        var selectionStartOrToday = $('.selected, .today', scrollContent).get(0)
        if (selectionStartOrToday) {
          scrollContent.scrollTop(selectionStartOrToday.offsetTop - (scrollContent.height() - selectionStartOrToday.offsetHeight) / 2)
        }
      }

      function setYearLabel() {
        var scrollContent = this
        var table = $('table', scrollContent).get(0)
        var rowNumber = parseInt(scrollContent.scrollTop / averageCellHeight)
        var date = table.rows[rowNumber].cells[2].date
        yearTitle.text(date.getFullYear())
      }

      function headerRow() {
        var tr = $('<tr>').append(yearCell())
        tr.append($('<th class="week">&nbsp;</th>'))
        $(Date.dayNames).each(function(index) {
          var weekDay = $('<th>').append(Date.dayNames[(index + params.locale.firstWeekday) % 7].substr(0, 2)).addClass('weekDay')
          tr.append(weekDay)
        })
        if (params.isPopup) {
          var close = $('<th><a href="#"><span>close</span></a>')
          $('a', close).click(toggleCalendar)
          tr.append(close)
        }
        return $('<thead>').append(tr)
        function yearCell() {
          return $('<th>').addClass('month').append(firstWeekdayOfGivenDate.getFullYear())
        }
      }

      function calculateCellHeightAndSetScroll() {
        calculateCellHeight()
        scrollToSelection()
      }

      function calculateCellHeight() {
        averageCellHeight = parseInt(bodyTable.height() / $('tr', bodyTable).size())
      }

      function toggleCalendar() {
        calendar.toggle()
        if (beforeFirstOpening) {
          calculateCellHeight()
          beforeFirstOpening = false
        }
        scrollToSelection()
        return false
      }

      function calendarBody() {
        var tbody = $('<tbody>')
        var firstWeekDay = calendarRange.start.getFirstDateOfWeek(params.locale.firstWeekday)
        var isFirst = true;
        while (firstWeekDay.compareTo(calendarRange.end) <= 0) {
          tbody.append(calendarRow(firstWeekDay.clone(), isFirst))
          isFirst = false
          firstWeekDay = firstWeekDay.plusDays(7)
        }
        return tbody
      }

      function calendarRow(firstDayOfWeek, isFirst) {
        var tr = $('<tr>').append(monthCell(firstDayOfWeek, isFirst)).append(weekCell(firstDayOfWeek))
        for (var i = 0; i < 7; i++) {
          var date = firstDayOfWeek.plusDays(i)
          tr.append(dateCell(date))
        }
        return tr
      }

      function dateCell(date) {
        var dateCell = $('<td>').addClass(dateStyles(date)).append(date.getDate())
        dateCell.get(0).date = date
        dateCellMap[date.dateFormat('Ymd')] = dateCells.length
        dateCells.push(dateCell)
        dateCellDates.push(date)
        return dateCell
      }

      function monthCell(firstDayOfWeek, isFirst) {
        var th = $('<th>').addClass('month').addClass(backgroundBy(firstDayOfWeek))
        if (isFirst || firstDayOfWeek.getDate() <= 7) {
          th.append(Date.monthNames[firstDayOfWeek.getMonth()]).addClass('monthName')
        } else {
          if (firstDayOfWeek.getDate() <= 7 * 2 && firstDayOfWeek.getMonth() == 0) {
            th.append(firstDayOfWeek.getFullYear())
          }
        }
        return th
      }

      function weekCell(firstDayOfWeek) {
        return $('<th>').addClass('week').addClass(backgroundBy(firstDayOfWeek)).append(firstDayOfWeek.getWeekInYear('ISO'))
      }

      function dateStyles(date) {
        return $.trim(['date', backgroundBy(date), disabledOrNot(date), todayStyle(date)].sort().join(' '))
      }

      function backgroundBy(date) {
        return date.isOddMonth() ? 'odd' : ''
      }

      function disabledOrNot(date) {
        var disabledWeekendDay = params.disableWeekends && date.isWeekend()
        var outOfBounds = !calendarRange.hasDate(date)
        return outOfBounds || disabledWeekendDay ? 'disabled' : ''
      }

      function todayStyle(date) {
        return date.isToday() ? 'today' : ''
      }

      function initSingleDateCalendarEvents() {
        $('.date', container).bind('click', function() {
          var dateCell = $(this)
          if (dateCell.hasClass('disabled')) return
          $('td.selected', container).removeClass('selected')
          dateCell.addClass('selected')
          params.startField.val(date(dateCell).dateFormat(params.locale.shortDateFormat))
          setDateLabel(date(dateCell).dateFormat(params.locale.weekDateFormat))
          if (params.isPopup) {
            toggleCalendar.call(this)
          }
          executeCallback()
        })

        if (params.startField.val()) {
          setDateLabel(Date.parseDate(params.startField.val(), params.locale.shortDateFormat).dateFormat(params.locale.weekDateFormat))
        }
      }

      function startNewRange() {
        selection = new DateRange(mouseDownDate, mouseDownDate)
      }

      function mouseDown(event) {
        var elem = event.target

        if (isInstantSelection(event)) {
          selection = instantSelection(event)
          return
        }

        if (enabledCell(elem)) {
          status = Status.CREATE
          mouseDownDate = elem.date
          if (mouseDownDate.equalsOnlyDate(selection.end)) {
            mouseDownDate = selection.start
            return
          }
          if (mouseDownDate.equalsOnlyDate(selection.start)) {
            mouseDownDate = selection.end
            return
          }
          if (selection.hasDate(mouseDownDate)) {
            status = Status.MOVE
            return
          }
          startNewRange()
        }
        function enabledCell(elem) {
          return isDateCell(elem) && isEnabled(elem)
        }

        function isInstantSelection(event) {
          return isWeekCell(event.target) || isMonthCell(event.target) || event.shiftKey
        }

        function instantSelection(event) {
          var elem = event.target
          if (isWeekCell(elem)) {
            status = Status.NONE
            var dayInWeek = date($(elem).siblings('.date'))
            return new DateRange(dayInWeek, dayInWeek.plusDays(6))
          } else if (isMonthCell(elem)) {
            status = Status.NONE
            var dayInMonth = date($(elem).siblings('.date'))
            return new DateRange(dayInMonth.firstDateOfMonth(), dayInMonth.lastDateOfMonth())
          } else if (event.shiftKey) {
            if (selection.days() > 0 && enabledCell(elem)) {
              status = Status.NONE
              selection.expandTo(elem.date)
              return selection
            }
          }
          return selection
        }
      }

      function mouseMove(event) {
        if (status == Status.NONE) {
          return
        }
        var date = event.target.date
        if (isEnabled(event.target)) {
          switch (status) {
            case Status.MOVE:
              var deltaDays = mouseDownDate.distanceInDays(date)
              mouseDownDate = date
              selection.shiftDays(deltaDays)
              selection = selection.and(calendarRange)
              break
            case Status.CREATE:
              selection = new DateRange(mouseDownDate, date)
              break
          }
          drawSelection()
        }
      }

      function mouseUp() {
        status = Status.NONE
        drawSelection()
        afterSelection()
      }

      function drawSelection() {
        drawSelectionBetweenDates(selection)
        $('span.rangeLengthLabel', container).text(Date.daysLabel(selection.days()))
      }

      function drawSelectionBetweenDates(range) {
        $('td.selected', container).removeClass('selected').removeClass('rangeStart').removeClass('rangeEnd')
        //iterateAndToggleCells(oldSelection.start, oldSelection.end)
        iterateAndToggleCells(range)
        oldSelection = range.clone()
      }

      function iterateAndToggleCells(range) {
        if (range.days() == 0) return
        var startIndex = dateCellMap[range.start.dateFormat('Ymd')]
        var endIndex = dateCellMap[range.end.dateFormat('Ymd')]
        for (var i = startIndex; i <= endIndex; i++) {
          setDateCellStyle(i, range.start, range.end)
        }
      }

      function setDateCellStyle(i, start, end) {
        var date = dateCellDates[i]
        var elem = dateCells[i].get(0)
        var styleClass = [dateStyles(date)]
        if (date.equalsOnlyDate(end)) {
          styleClass.push('selected rangeEnd')
        } else {
          if (date.equalsOnlyDate(start)) {
            styleClass.push('selected rangeStart')
          } else {
            if (date.isBetweenDates(start, end)) {
              styleClass.push('selected')
            }
          }
        }
        elem.className = styleClass.join(' ')
      }

      function afterSelection() {
        var formattedStart = formatDate(selection.start)
        var formattedEnd = formatDate(selection.end)
        container.data('calendarRange', selection)
        setStartField(formattedStart)
        setEndField(formattedEnd)
        setRangeLabels()
        executeCallback()
      }

      function setRangeLabels() {
        if (selection.start && selection.end) {
          var format = params.locale.weekDateFormat
          $('span.startDateLabel', container).text(selection.start.dateFormat(format))
          $('span.endDateLabel', container).text(selection.end.dateFormat(format))
          $('span.separator', container).show()
        } else {
          $('span.separator', container).hide()
        }
      }

      function fieldDate(field) {
        if (field.length > 0 && field.val().length > 0) {
          return Date.parseDate(field.val(), params.locale.shortDateFormat)
        } else {
          return null
        }
      }

      function disableTextSelection(elem) {
        if ($.browser.mozilla) {//Firefox
          $(elem).css('MozUserSelect', 'none')
        } else {
          if ($.browser.msie) {//IE
            $(elem).bind('selectstart', function() {
              return false
            })
          } else {//Opera, etc.
            $(elem).mousedown(function() {
              return false
            })
          }
        }
      }

      function executeCallback() {
        params.callback.call(container, selection)
        container.trigger('calendarChange', selection)
      }

      function isDateCell(elem) {
        return $(elem).hasClass('date')
      }

      function isWeekCell(elem) {
        return $(elem).hasClass('week')
      }

      function isMonthCell(elem) {
        return $(elem).hasClass('month')
      }

      function isEnabled(elem) {
        return !$(elem).hasClass('disabled')
      }

      function date(elem) {
        return elem.get(0).date
      }

      function setStartField(value) {
        params.startField.val(value)
      }

      function setEndField(value) {
        params.endField.val(value)
      }

      function formatDate(date) {
        return date.dateFormat(params.locale.shortDateFormat)
      }

      function setDateLabel(val) {
        $('span.startDateLabel', container).text(val)
      }

      function isRange() {
        return params.endField && params.endField.length > 0
      }
    }
  }
  $.fn.calendarRange = function() {
    return $(this).data('calendarRange')
  }
  $.fn.exists = function() {
    return this.length > 0
  }
  $.fn.isEmpty = function() {
    return this.length == 0
  }
})(jQuery)