# in-the-loop
Showcasing execution flow control in the browser. (Timeouts, Observables, RAF)

Some breakpoints are set. Use them to compare how Firefox and Chrome use the async scheduler very differently between repaints. 

# takeaway 1
Both browsers can visibly update textContents in DOM nodes without a repaint

# takeaway 2
The asyncscheduler in Firefox gets a lot more chance to execute between repaints. In scenarios when you rely on asyncScheduler, firefox run be a lot faster.
